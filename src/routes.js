export const sharedRoutes = [
    {
        path: '/account',
        name: 'Account',
        component: () => import('@shared/views/account/Account.vue'),
    },
    {
        path: '/account/invitations',
        name: 'AccountInvitations',
        component: () => import('@shared/views/account/AccountInvitations.vue'),
    },
    {
        path: '/account/settings',
        name: 'AccountSettings',
        component: () => import('@shared/views/account/AccountSettings.vue'),
    },
    {
        path: '/patreon/callback',
        name: 'PatreonCallback',
        component: () => import('@shared/views/patreon/OAuthCallback.vue'),
    },
    {
        path: '/account/active-realm',
        name: 'ActiveRealmDetails',
        component: () => import('@shared/views/account/ActiveRealmDetails.vue'),
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/account/active-realm/sessions',
        name: 'Sessions',
        component: () => import('@shared/views/account/Sessions.vue'),
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/realm/create',
        name: 'RealmCreate',
        component: () => import('@shared/views/RealmCreate.vue'),
    },
    {
        path: '/moon',
        name: 'Moon',
        component: () => import('@shared/views/Moon.vue'),
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/gallery',
        name: 'Gallery',
        component: () => import('@shared/views/members/Gallery.vue'),
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/gallery/add',
        name: 'MemberAdd',
        component: () => import('@shared/views/members/MemberAdd.vue'),
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/gallery/:id',
        name: 'Member',
        component: () => import('@shared/views/members/Member.vue'),
        props: true,
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/gallery/edit/:id',
        name: 'MemberEdit',
        component: () => import('@shared/views/members/MemberEdit.vue'),
        props: true,
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/rooms/add',
        name: 'AddRoom',
        component: () => import('@shared/views/AddRoom.vue'),
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/rooms/:path',
        name: 'Room',
        component: () => import('@shared/views/Room.vue'),
        props: true,
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/rooms/:path/edit',
        name: 'EditRoom',
        component: () => import('@shared/views/EditRoom.vue'),
        props: true,
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/rooms/:path/add-content',
        name: 'AddContent',
        component: () => import('@shared/views/AddContent.vue'),
        props: true,
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/rooms/:pathMatch(.*)/add-content',
        name: 'AddChildContent',
        component: () => import('@shared/views/AddContent.vue'),
        props: route => {
            const pathMatch = route.params.pathMatch;
            const pathParts = pathMatch.split('/');
            const roomPath = pathParts[0];
            const parentPath = pathMatch;
            return { roomPath, parentPath, isChildContent: true };
        },
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/rooms/:pathMatch(.*)/edit-content',
        name: 'EditContent',
        component: () => import('@shared/views/EditContent.vue'),
        props: route => {
            const pathMatch = route.params.pathMatch;
            const pathParts = pathMatch.split('/');
            const roomPath = pathParts[0];
            const contentPath = pathParts.slice(1).join('/');
            const fullContentPath = `/${pathMatch}`;
            return { roomPath, contentName: contentPath, fullContentPath };
        },
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/rooms/:pathMatch(.*)',
        name: 'ContentArticle',
        component: () => import('@shared/views/ContentArticle.vue'),
        props: route => {
            const pathMatch = route.params.pathMatch;
            const pathParts = pathMatch.split('/');
            const roomPath = pathParts[0];
            const contentPath = pathParts.slice(1).join('/');
            const fullContentPath = `/${pathMatch}`;
            return { roomPath, contentName: contentPath, fullContentPath };
        },
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/realm/ai',
        name: 'RealmAI',
        component: () => import('@shared/views/ai/RealmAI.vue'),
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/reports',
        name: 'Reports',
        component: () => import('@shared/views/Reports.vue'),
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/reports/report/:id',
        name: 'ReportView',
        component: () => import('@shared/views/Reports.vue'),
        props: true,
        meta: { requiresActiveRealm: true }
    },
    {
        path: '/reports/:id',
        name: 'ReportViewLegacy',
        component: () => import('@shared/views/Reports.vue'),
        props: true,
        meta: { requiresActiveRealm: true }
    },
];

/**
 * Shared beforeEach guard for realm deep-linking and active realm checks.
 * Call this from each app's router.beforeEach.
 */
export function createRealmGuard(router) {
    let realmDeepLinkHandled = false;

    router.beforeEach(async (to, from, next) => {
        const { useRealmStore } = await import('@shared/stores/realm');
        const { useUserStore } = await import('@shared/stores/user');

        // Handle ?realm=<realmId> deep-link
        if (!realmDeepLinkHandled && to.query.realm) {
            realmDeepLinkHandled = true;
            const realmId = to.query.realm;
            const realmStore = useRealmStore();
            const userStore = useUserStore();

            let attempts = 0;
            while ((!userStore.loaded || !realmStore.loaded) && attempts < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (realmStore.loaded) {
                try {
                    await realmStore.setActiveRealm(realmId);
                } catch (err) {
                    console.error('Failed to set realm from deep link:', err);
                }
            }

            const { realm, ...otherQuery } = to.query;
            next({ path: to.path, query: otherQuery, replace: true });
            return;
        }

        if (to.meta.requiresActiveRealm) {
            const userStore = useUserStore();
            const realmStore = useRealmStore();

            if (!userStore.loaded) {
                let attempts = 0;
                const maxAttempts = 100;
                while (!userStore.loaded && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                if (!userStore.loaded) {
                    console.warn('User store failed to load within timeout. Redirecting to /account');
                    next('/account');
                    return;
                }
            }

            if (!realmStore.loaded) {
                let attempts = 0;
                const maxAttempts = 100;
                while (!realmStore.loaded && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                if (!realmStore.loaded) {
                    console.warn('Realm store failed to load within timeout. Redirecting to /account');
                    next('/account');
                    return;
                }
            }

            if (!realmStore.activeRealm) {
                if (realmStore.arRealms.length === 0) {
                    next('/account');
                    return;
                }

                try {
                    const firstRealm = realmStore.arRealms[0];
                    await realmStore.setActiveRealm(firstRealm.RealmID);
                    if (!realmStore.activeRealm) {
                        console.warn('Failed to set active realm. Redirecting to /account');
                        next('/account');
                        return;
                    }
                } catch (error) {
                    console.error('Error setting active realm:', error);
                    next('/account');
                    return;
                }
            }
        }

        next();
    });
}
