package app.hopps.shared.infrastructure.storage;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

/**
 * Selects and configures the {@link FileStorage} backend.
 * <p>
 * This is a runtime property, so the same container image can run against S3 in the cloud and against a mounted volume
 * on a single-node install:
 *
 * <pre>
 * HOPPS_STORAGE_TYPE=local
 * HOPPS_STORAGE_LOCAL_ROOT=/var/lib/hopps/storage
 * </pre>
 *
 * Note that the S3 Dev Services (LocalStack) still start in dev and test mode unless
 * {@code quarkus.s3.devservices.enabled=false} is set alongside {@code type=local}.
 */
@ConfigMapping(prefix = "hopps.storage")
public interface StorageConfig {

    /**
     * @return which backend stores uploaded files
     */
    @WithDefault("s3")
    Backend type();

    S3 s3();

    Local local();

    enum Backend {
        S3,
        LOCAL
    }

    interface S3 {
        /**
         * @return the bucket that holds all files. Defaults to the legacy {@code bucket.name} property so existing
         *         deployments keep working.
         */
        @WithDefault("${bucket.name:documents}")
        String bucket();
    }

    interface Local {
        /**
         * @return the directory that holds all files. Must be writable and, in production, backed by a persistent
         *         volume — the default points at the temp directory and is only meant for local development.
         */
        @WithDefault("${java.io.tmpdir}/hopps-storage")
        String root();
    }
}
