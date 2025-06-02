import path from 'path';
import { describe, it } from 'vitest';
import { PactV3 as Pact, MatchersV3 as Matchers, V3MockServer } from '@pact-foundation/pact';
import { fromProviderState } from '@pact-foundation/pact/src/v3/matchers'; // 👈 import directly

import { OrganizationService } from '@/services/api/OrganizationService';

const { like, string } = Matchers;

const provider = new Pact({
    dir: path.resolve(process.cwd(), '../../pacts'),
    consumer: 'spa',
    provider: 'org-invite',
    host: '127.0.0.1',
    port: 1234,
    logLevel: 'debug',
});

describe('OrganizationService - inviteOrganizationMember', () => {
    it('sends an invite to a member for a given organization slug', async () => {
        const email = 'test@hopps.cloud';
        const slug = 'gruenes-herz-ev';

        await provider
            .given(`Organization ${slug} exists`)
            .uponReceiving('a request to invite a member')
            .withRequest({
                method: 'POST',
                path: `/organization/${slug}/member`,
                body: {
                    email: like(email),
                },
            })
            .willRespondWith({
                status: 202,
            })
            .executeTest(async (mockserver: V3MockServer) => {
                const organizationServiceProvider = new OrganizationService(mockserver.url);
                await organizationServiceProvider.inviteOrganizationMember(email, slug);
            });
    });

    it('confirms invitation for organization with id 1', async () => {
        const payload = {
            firstName: 'John',
            lastName: 'Doe',
        };

        // const bodyPayload = Matchers.like({
        //     firstName: string(payload.firstName),
        //     lastName: string(payload.lastName),
        // });

        // /organization/join/{invite_process_instance_id}
        // await provider.addInteraction({
        //     states: [{
        //         description: `Member was invited before`, parameters: {}
        //     }],
        //     uponReceiving: 'a request to confirm invitation',
        //     withRequest: {
        //         method: 'POST',
        //         // @ts-expect-error the returned object extends matcher (compiler muted).
        //         path: fromProviderState('/member/invitation/accept/${pid}', '/member/invitation/accept/running-process-instance-id'),
        //         body: bodyPayload || undefined,
        //     },
        //     willRespondWith: {
        //         status: 201,
        //     },
        // });

        await provider
            .given('Member was invited before', { pid: 'test_process_id' })
            .uponReceiving('a request to confirm invitation')
            .withRequest({
                method: 'POST',
                path: fromProviderState('/member/invitation/accept/${pid}', '/member/invitation/accept/test_process_id'),
                body: like({
                    firstName: string(payload.firstName),
                    lastName: string(payload.lastName),
                }),
            })
            .willRespondWith({
                status: 201,
            })
            .executeTest(async (mockserver: V3MockServer) => {
                const organizationServiceProvider = new OrganizationService(mockserver.url);
                await organizationServiceProvider.confirmOrganizationInvitation('test_process_id', payload);
            });
    });
});
