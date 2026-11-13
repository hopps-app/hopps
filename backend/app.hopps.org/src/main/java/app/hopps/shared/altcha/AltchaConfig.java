package app.hopps.shared.altcha;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

import java.util.Optional;

/**
 * Spam protection for the public registration: the browser has to solve an ALTCHA proof-of-work challenge before an
 * organization and its owner account are created.
 * <p>
 * Challenges are signed with an HMAC secret. Without one configured, every process signs with a random secret of its
 * own. That is enough for a single replica; several replicas must share one secret, or a challenge issued by one
 * replica is rejected by the others:
 *
 * <pre>
 * HOPPS_ALTCHA_HMAC_SECRET = &lt;long random string&gt;
 * </pre>
 */
@ConfigMapping(prefix = "hopps.altcha")
public interface AltchaConfig {

    /**
     * @return whether a registration needs a solved challenge. Challenges are issued either way, so the registration
     *         form works unchanged when this is switched off.
     */
    @WithDefault("true")
    boolean enabled();

    /**
     * @return the secret that signs challenges; random per process when not set.
     */
    Optional<String> hmacSecret();

    /**
     * @return PBKDF2 iterations for each attempt the browser makes.
     */
    @WithDefault("1000")
    int cost();

    /**
     * @return the smallest number of attempts a challenge takes to solve.
     */
    @WithDefault("1000")
    int counterMin();

    /**
     * @return the largest number of attempts a challenge takes to solve.
     */
    @WithDefault("3000")
    int counterMax();
}
