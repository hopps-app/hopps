package app.hopps.shared.security;

import app.hopps.member.domain.Permission;
import app.hopps.member.domain.Role;
import io.quarkus.security.Authenticated;
import io.quarkus.security.PermissionsAllowed;
import jakarta.annotation.security.DenyAll;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guards the permission model on the REST endpoints. {@code deny-unannotated-endpoints} already denies an endpoint
 * without a security annotation at runtime; these checks catch the same mistakes at build time and add the one rule the
 * runtime cannot know: an endpoint that changes data must need more than the read permission.
 */
class EndpointSecurityTest {

    private static final List<Class<? extends Annotation>> SECURITY_ANNOTATIONS = List.of(PermissionsAllowed.class,
            Authenticated.class, RolesAllowed.class, PermitAll.class, DenyAll.class);

    private static final List<Class<? extends Annotation>> WRITE_METHODS = List.of(POST.class, PUT.class,
            PATCH.class, DELETE.class);

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
    void invitedMembersKeepTheirRightsButCannotManageMembers() {
        assertEquals(EnumSet.of(Permission.VIEW_BOOKKEEPING, Permission.EDIT_BOOKKEEPING,
                Permission.MANAGE_ORGANIZATION), Role.ADMIN.getPermissions());
        assertFalse(Role.ADMIN.getPermissions().contains(Permission.MANAGE_MEMBERS));
        assertTrue(Role.OWNER.getPermissions().containsAll(EnumSet.allOf(Permission.class)));
    }

    private static boolean hasSecurityAnnotation(java.lang.reflect.AnnotatedElement element) {
        return SECURITY_ANNOTATIONS.stream().anyMatch(element::isAnnotationPresent);
    }

    private static String describe(Method method) {
        return method.getDeclaringClass().getSimpleName() + "#" + method.getName();
    }

    /** All HTTP methods of the server-side resources (classes with {@code @Path}, REST client interfaces excluded). */
    private static List<Method> endpointMethods() throws IOException, URISyntaxException {
        var root = Paths.get(Permission.class.getProtectionDomain().getCodeSource().getLocation().toURI());
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
