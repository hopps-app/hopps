declare global {
    const suite: (typeof import('vitest'))['suite'];
    const test: (typeof import('vitest'))['test'];
    const describe: (typeof import('vitest'))['describe'];
    const it: (typeof import('vitest'))['it'];
    const expectTypeOf: (typeof import('vitest'))['expectTypeOf'];
    const assertType: (typeof import('vitest'))['assertType'];
    const expect: (typeof import('vitest'))['expect'];
    const assert: (typeof import('vitest'))['assert'];
    const vitest: (typeof import('vitest'))['vitest'];
    const vi: (typeof import('vitest'))['vitest'];
    const beforeAll: (typeof import('vitest'))['beforeAll'];
    const afterAll: (typeof import('vitest'))['afterAll'];
    const beforeEach: (typeof import('vitest'))['beforeEach'];
    const afterEach: (typeof import('vitest'))['afterEach'];
    const onTestFailed: (typeof import('vitest'))['onTestFailed'];
    const onTestFinished: (typeof import('vitest'))['onTestFinished'];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace JSX {
    interface IntrinsicElements {
        'em-emoji': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { id: string };
    }
}

export {};
