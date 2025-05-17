import path from 'path';
import { describe, it, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { Pact, Matchers } from '@pact-foundation/pact';

import { OrganizationService } from '@/services/api/OrganizationService'; // 👈 import directly

const { like, string } = Matchers;

const provider = new Pact({
    dir: path.resolve(process.cwd(), '../../pacts'),
    consumer: 'OrganizationServiceConsumer',
    provider: 'OrganizationServiceProvider',
    host: '127.0.0.1',
    port: 1234,
    logLevel: 'debug',
});

describe('OrganizationService - inviteOrganizationMember', () => {
    let organizationServiceProvider: OrganizationService;

    const basePath = 'http://127.0.0.1:1234';

    beforeAll(() => provider.setup());
    afterAll(() => provider.finalize());

    beforeEach(() => {
        organizationServiceProvider = new OrganizationService(basePath);
    });

    afterEach(() => provider.verify());

    it('sends an invite to a member for a given organization slug', async () => {
        const email = 'test@example.com';
        const slug = organizationServiceProvider.createSlug('organization-name');

        await provider.addInteraction({
            state: `Organization ${slug} exists`,
            uponReceiving: 'a request to invite a member',
            withRequest: {
                method: 'POST',
                path: `/organization/${slug}/member`,
                body: {
                    email: like(email),
                },
            },
            willRespondWith: {
                status: 202,
            },
        });

        await organizationServiceProvider.inviteOrganizationMember(email, slug);
    });

    it('confirms invitation for organization with id 1', async () => {
        const payload = {
            firstName: 'John',
            lastName: 'Doe',
        };

        const bodyPayload = Matchers.like({
            firstName: string(payload.firstName),
            lastName: string(payload.lastName),
        });

        await provider.addInteraction({
            state: `Organization exists`,
            uponReceiving: 'a request to confirm invitation',
            withRequest: {
                method: 'POST',
                path: Matchers.regex({ generate: '/organization/join/1', matcher: '/organization/join/[0-9]+' }),
                body: bodyPayload || undefined,
            },
            willRespondWith: {
                status: 201,
            },
        });

        await organizationServiceProvider.confirmOrganizationInvitation(1, payload);
    });
});
