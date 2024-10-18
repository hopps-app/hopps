function HeaderMobileMenuButton() {
    return (
        <div className="sm:hidden">
            <button
                type="button"
                className="hs-collapse-toggle relative flex justify-center items-center border border-white/10 font-medium text-sm text-gray-200 rounded-lg hover:bg-white/10 focus:outline-none focus:bg-white/10"
                id="hs-navbar-cover-page-collapse"
                aria-expanded="false"
                aria-controls="hs-navbar-cover-page"
                aria-label="Toggle navigation"
                data-hs-collapse="#hs-navbar-cover-page"
            >
                <svg className="hs-collapse-open:hidden shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M4 18H20C20.55 18 21 17.55 21 17C21 16.45 20.55 16 20 16H4C3.45 16 3 16.45 3 17C3 17.55 3.45 18 4 18ZM4 13H20C20.55 13 21 12.55 21 12C21 11.45 20.55 11 20 11H4C3.45 11 3 11.45 3 12C3 12.55 3.45 13 4 13ZM3 7C3 7.55 3.45 8 4 8H20C20.55 8 21 7.55 21 7C21 6.45 20.55 6 20 6H4C3.45 6 3 6.45 3 7Z"
                        fill="#1C0C28"
                    />
                </svg>

                <svg
                    className="hs-collapse-open:block hidden shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                </svg>
                <span className="sr-only">Toggle navigation</span>
            </button>
        </div>
    );
}

export default HeaderMobileMenuButton;
