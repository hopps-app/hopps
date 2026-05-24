import { Suspense, lazy } from "react";
import type { ClassKey } from "keycloakify/login";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import DefaultPage from "keycloakify/login/DefaultPage";

import type { KcContext } from "./KcContext";
import type { I18n } from "./i18n";
import { useI18n } from "./i18n";

import DefaultTemplate from "./Template";

import hoppsLogo from "../assets/hopps-logo.svg";

import "./main.css";

const UserProfileFormFields = lazy(
    () => import("keycloakify/login/UserProfileFormFields")
);

const doMakeUserConfirmPassword = true;

function HoppsTemplate(props: TemplateProps<KcContext, I18n>) {
    const { kcContext, i18n, children, ...rest } = props;
    const { msg } = i18n;

    return (
        <DefaultTemplate
            {...rest}
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
}

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
                                Template={HoppsTemplate}
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
