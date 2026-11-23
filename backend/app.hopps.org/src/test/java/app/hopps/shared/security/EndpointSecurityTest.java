package app.hopps.shared.security;

import app.hopps.member.domain.Permission;
import app.hopps.member.domain.Role;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.security.Authenticated;
import io.quarkus.security.PermissionsAllowed;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.specification.RequestSpecification;
import jakarta.annotation.security.DenyAll;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guards the permission model on the REST endpoints. {@code deny-unannotated-endpoints} already denies an endpoint
 * without a security annotation at runtime; the static checks catch the same mistakes at build time and add the one
 * rule the runtime cannot know: an endpoint that changes data must need more than the read permission.
 * <p>
 * The role matrix calls every {@code @PermissionsAllowed} endpoint once per role and expects a 403 exactly where the
 * role lacks the permission. New endpoints are covered without touching this test.
 */
@QuarkusTest
class EndpointSecurityTest {

    private static final List<Class<? extends Annotation>> SECURITY_ANNOTATIONS = List.of(PermissionsAllowed.class,
            Authenticated.class, RolesAllowed.class, PermitAll.class, DenyAll.class);

    private static final List<Class<? extends Annotation>> WRITE_METHODS = List.of(POST.class, PUT.class,
            PATCH.class, DELETE.class);

    private static final Pattern PATH_PARAM = Pattern.compile("\\{[^}]*}");

    /** Fills every path parameter, so lookups end in a 404 and nothing existing is changed. */
    private static final String UNKNOWN_ID = "999999";

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Test
    void everyEndpointDeclaresWhoMayCallIt() throws Exception {
        List<String> unannotated = new ArrayList<>();
        for (Method method : endpointMethods()) {
            if (!hasSecurityAnnotation(method) && !hasSecurityAnnotation(method.getDeclaringClass())) {
                unannotated.add(describe(method));
            }
        }
        assertTrue(unannotated.isEmpty(), "Endpoints without a security annotation: " + unannotated);
    }

    @Test
    void writeEndpointsNeedMoreThanTheReadPermission() throws Exception {
        List<String> readOnly = new ArrayList<>();
        for (Method method : endpointMethods()) {
            boolean writes = WRITE_METHODS.stream().anyMatch(method::isAnnotationPresent);
            PermissionsAllowed permissions = method.getAnnotation(PermissionsAllowed.class);
            if (writes && permissions != null
                    && Arrays.asList(permissions.value()).contains(Permission.Names.VIEW_BOOKKEEPING)) {
                readOnly.add(describe(method));
            }
        }
        assertTrue(readOnly.isEmpty(), "Write endpoints that only need VIEW_BOOKKEEPING: " + readOnly);
    }

    @Test
    void bookkeepingEndpointsDoNotFallBackToAClassLevelAnnotation() throws Exception {
        // A class-level @Authenticated would let a forgotten method through for every member; the bookkeeping
        // resources therefore annotate each method and leave the class without one.
        List<String> fallingBack = new ArrayList<>();
        for (Method method : endpointMethods()) {
            Class<?> resource = method.getDeclaringClass();
            boolean usesPermissions = Arrays.stream(resource.getDeclaredMethods())
                    .anyMatch(m -> m.isAnnotationPresent(PermissionsAllowed.class));
            if (usesPermissions && !hasSecurityAnnotation(method)) {
                fallingBack.add(describe(method));
            }
        }
        assertTrue(fallingBack.isEmpty(), "Endpoints relying on a class-level annotation: " + fallingBack);
    }

    @Test
    void permissionNamesMatchTheEnum() {
        List<String> names = Stream.of(Permission.Names.class.getDeclaredFields())
                .filter(field -> field.getType() == String.class)
                .map(field -> {
                    try {
                        assertEquals(field.getName(), field.get(null), "Constant " + field.getName());
                        return field.getName();
                    } catch (IllegalAccessException e) {
                        throw new IllegalStateException(e);
                    }
                })
                .sorted()
                .toList();
        List<String> enumNames = Stream.of(Permission.values()).map(Enum::name).sorted().toList();
        assertEquals(enumNames, names);
    }

    @Test
    void treasurersKeepTheBooksButNeitherManageTheOrganizationNorMembers() {
        assertEquals(EnumSet.of(Permission.VIEW_BOOKKEEPING, Permission.EDIT_BOOKKEEPING), Role.ADMIN.getPermissions());
        assertFalse(Role.ADMIN.getPermissions().contains(Permission.MANAGE_MEMBERS));
        assertFalse(Role.ADMIN.getPermissions().contains(Permission.MANAGE_ORGANIZATION));
        assertTrue(Role.OWNER.getPermissions().containsAll(EnumSet.allOf(Permission.class)));
    }

    @Test
    void boardAndAuditorOnlyView() {
        assertEquals(EnumSet.of(Permission.VIEW_BOOKKEEPING), Role.BOARD.getPermissions());
        assertEquals(EnumSet.of(Permission.VIEW_BOOKKEEPING), Role.AUDITOR.getPermissions());
        assertFalse(Role.OWNER.isAssignable());
    }

    // The role matrix uses the test data organization "Bühnefrei" (id 4), which has one member per role.

    @Test
    @TestSecurity(user = "alice@example.test")
    @OidcSecurity(claims = @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a"))
    void ownerReachesTheEndpointsOfTheirPermissions() throws Exception {
        assertRoleMatrix(Role.OWNER);
    }

    @Test
    @TestSecurity(user = "jdoe@example.test")
    @OidcSecurity(claims = @Claim(key = "sub", value = "1eed6a8e-a853-4597-b4c6-c4c2533546a0"))
    void treasurerReachesTheEndpointsOfTheirPermissions() throws Exception {
        assertRoleMatrix(Role.ADMIN);
    }

    @Test
    @TestSecurity(user = "bob@example.test")
    @OidcSecurity(claims = @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000023"))
    void boardReachesTheEndpointsOfTheirPermissions() throws Exception {
        assertRoleMatrix(Role.BOARD);
    }

    @Test
    @TestSecurity(user = "samantha1284@net-mail.none")
    @OidcSecurity(claims = @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000015"))
    void auditorReachesTheEndpointsOfTheirPermissions() throws Exception {
        assertRoleMatrix(Role.AUDITOR);
    }

    /**
     * Calls every {@code @PermissionsAllowed} endpoint as the current test user, who holds {@code role}. A role without
     * the permission must get a 403; a role with it must get past the check (any status but 401 and 403).
     */
    private void assertRoleMatrix(Role role) throws Exception {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();

        Set<String> granted = role.getPermissions().stream().map(Enum::name).collect(Collectors.toSet());
        List<String> wrong = new ArrayList<>();
        int checked = 0;
        for (Method method : endpointMethods()) {
            PermissionsAllowed required = method.getAnnotation(PermissionsAllowed.class);
            if (required == null) {
                continue;
            }
            checked++;
            boolean allowed = required.inclusive()
                    ? Arrays.stream(required.value()).allMatch(granted::contains)
                    : Arrays.stream(required.value()).anyMatch(granted::contains);
            int status = call(method);
            if (status == 401 || allowed == (status == 403)) {
                wrong.add(describe(method) + " " + httpMethod(method) + " " + pathOf(method) + " -> " + status
                        + (allowed ? ", expected access" : ", expected 403"));
            }
        }
        assertTrue(checked > 0, "No @PermissionsAllowed endpoints found");
        assertTrue(wrong.isEmpty(), role + ":\n" + String.join("\n", wrong));
    }

    /**
     * Sends a request the endpoint cannot act on: unknown ids in the path and, for writes, a body that does not parse.
     * Quarkus checks permissions before it reads the body, so a role with access ends in a 400 or 404, not in a change.
     */
    private static int call(Method method) {
        String path = PATH_PARAM.matcher(pathOf(method)).replaceAll(UNKNOWN_ID);
        RequestSpecification request = given().redirects().follow(false);
        if (method.isAnnotationPresent(POST.class) || method.isAnnotationPresent(PUT.class)
                || method.isAnnotationPresent(PATCH.class)) {
            if (consumes(method, MediaType.MULTIPART_FORM_DATA)) {
                request = request.contentType("multipart/form-data; boundary=hopps")
                        .body("--hopps--".getBytes(StandardCharsets.UTF_8));
            } else {
                request = request.contentType(MediaType.APPLICATION_JSON).body("{");
            }
        }
        return request.request(httpMethod(method), path).statusCode();
    }

    private static boolean consumes(Method method, String mediaType) {
        Consumes consumes = method.isAnnotationPresent(Consumes.class)
                ? method.getAnnotation(Consumes.class)
                : method.getDeclaringClass().getAnnotation(Consumes.class);
        return consumes != null && Arrays.asList(consumes.value()).contains(mediaType);
    }

    private static String httpMethod(Method method) {
        if (method.isAnnotationPresent(POST.class)) {
            return "POST";
        }
        if (method.isAnnotationPresent(PUT.class)) {
            return "PUT";
        }
        if (method.isAnnotationPresent(PATCH.class)) {
            return "PATCH";
        }
        if (method.isAnnotationPresent(DELETE.class)) {
            return "DELETE";
        }
        return "GET";
    }

    private static String pathOf(Method method) {
        String resource = method.getDeclaringClass().getAnnotation(Path.class).value();
        Path sub = method.getAnnotation(Path.class);
        String path = sub == null ? resource : resource + "/" + sub.value();
        return ("/" + path).replaceAll("/+", "/").replaceAll("(.)/$", "$1");
    }

    private static boolean hasSecurityAnnotation(java.lang.reflect.AnnotatedElement element) {
        return SECURITY_ANNOTATIONS.stream().anyMatch(element::isAnnotationPresent);
    }

    private static String describe(Method method) {
        return method.getDeclaringClass().getSimpleName() + "#" + method.getName();
    }

    /** All HTTP methods of the server-side resources (classes with {@code @Path}, REST client interfaces excluded). */
    private static List<Method> endpointMethods() throws IOException {
        // The compiled classes of this module. Under @QuarkusTest the classes come from Quarkus's class loader, which
        // reports no code source location, so the directory is resolved from the module root (Maven's working
        // directory).
        var root = Paths.get("target", "classes").toAbsolutePath();
        assertTrue(Files.isDirectory(root), "No compiled classes under " + root);
        List<Method> methods = new ArrayList<>();
        try (Stream<java.nio.file.Path> files = Files.walk(root)) {
            for (java.nio.file.Path file : files.filter(f -> f.toString().endsWith(".class")).toList()) {
                String className = root.relativize(file)
                        .toString()
                        .replace(java.io.File.separatorChar, '.')
                        .replaceAll("\\.class$", "");
                if (!className.startsWith("app.hopps.") || className.contains("$")) {
                    continue;
                }
                Class<?> type = load(className);
                if (type == null || type.isInterface() || !type.isAnnotationPresent(Path.class)) {
                    continue;
                }
                for (Method method : type.getDeclaredMethods()) {
                    if (method.isAnnotationPresent(GET.class)
                            || WRITE_METHODS.stream().anyMatch(method::isAnnotationPresent)) {
                        methods.add(method);
                    }
                }
            }
        }
        assertFalse(methods.isEmpty(), "No endpoints found under " + root);
        return methods;
    }

    private static Class<?> load(String className) {
        try {
            return Class.forName(className, false, EndpointSecurityTest.class.getClassLoader());
        } catch (ClassNotFoundException | LinkageError e) {
            return null;
        }
    }
}
