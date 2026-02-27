import { Suspense, lazy } from "react";
import type { ClassKey } from "keycloakify/login";
import DefaultPage from "keycloakify/login/DefaultPage";

import type { KcContext } from "./KcContext";
import { useI18n } from "./i18n";

import DefaultTemplate from "keycloakify/login/Template";

import hoppsLogo from "../assets/hopps-logo.svg";

import "./main.css";

const UserProfileFormFields = lazy(
    () => import("keycloakify/login/UserProfileFormFields")
);

const doMakeUserConfirmPassword = true;

export default function KcPage(props: { kcContext: KcContext }) {
    const { kcContext } = props;

    const { i18n } = useI18n({ kcContext });

    return (
        <Suspense>
            {(() => {
                switch (kcContext.pageId) {
                    default:
                        return (
                            <DefaultPage
                                kcContext={kcContext}
                                i18n={i18n}
                                classes={classes}
                                Template={({ kcContext, i18n, children, ...props }) => {
                                    const { msg } = i18n;
                                    return (
                                        <DefaultTemplate
                                            {...props}
                                            kcContext={kcContext}
                                            i18n={i18n}
                                        >
                                            <div
                                                id="kc-header-wrapper"
                                                className="custom-header"
                                            >
                                                <img
                                                    src={hoppsLogo}
                                                    alt="Hopps Logo"
                                                    className="custom-logo"
                                                />
                                                <p className="custom-subtitle">
                                                    {msg("loginSubtitle")}
                                                </p>
                                            </div>
                                            {children}
                                        </DefaultTemplate>
                                    );
                                }}
                                doUseDefaultCss={true}
                                UserProfileFormFields={UserProfileFormFields}
                                doMakeUserConfirmPassword={doMakeUserConfirmPassword}
                            />
                        );
                }
            })()}
        </Suspense>
    );
}

const classes = {} satisfies { [key in ClassKey]?: string };
