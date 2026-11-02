import { createRouter, createWebHistory } from 'vue-router'
import store from '../store'
import { applyRouteSeo } from '@/utils/seo'
import { isChunkLoadErrorMessage, reloadForStaleChunks } from '@/utils/chunkLoadRecovery'
import { isCurrentUserAdmin } from '@/utils/auth'



const routes = [{
        path: '/photo-collage',
        name: 'photo-collage',
        component: () => import(/* webpackChunkName: "photo-collage" */ '../views/PhotoCollage.vue'),
        meta: { requiresAuth: false, seoTitle: '在线图片拼图', seoDescription: '160 种图片拼图模板，上传照片、拖动缩放、调整间距与圆角，导出 PNG 或轮播拼图。' },
    }, {
        path: '/',
        name: 'Home',
        component: () => import(/* webpackChunkName: "home" */ '../views/Home.vue')
    },
    {
        path: '/ai-picture-book',
        name: 'ai-picture-book-intro',
        component: () => import(/* webpackChunkName: "public-seo-pages" */ '../views/PublicSeoPage.vue'),
    },
    {
        path: '/guides/ai-picture-book-tutorial',
        name: 'ai-picture-book-tutorial',
        component: () => import(/* webpackChunkName: "public-seo-pages" */ '../views/PublicSeoPage.vue'),
    },
    {
        path: '/guides/ai-picture-book-character-consistency',
        name: 'ai-picture-book-character-consistency',
        component: () => import(/* webpackChunkName: "public-seo-pages" */ '../views/PublicSeoPage.vue'),
    },
    {
        path: '/guides/ai-picture-book-storyboard-prompts',
        name: 'ai-picture-book-storyboard-prompts',
        component: () => import(/* webpackChunkName: "public-seo-pages" */ '../views/PublicSeoPage.vue'),
    },
    {
        path: '/guides/ai-picture-book-pdf-layout',
        name: 'ai-picture-book-pdf-layout',
        component: () => import(/* webpackChunkName: "public-seo-pages" */ '../views/PublicSeoPage.vue'),
    },
    {
        path: '/wechat/callback',
        name: 'WeChatCallback',
        component: () => import(/* webpackChunkName: "wechat-callback" */ '../views/WeChatCallback.vue')
    },
    {
        path: '/ai-picture',
        redirect: '/creation-studio/illustration/ai',
    },
    {
        path: '/AIbooks',
        redirect: '/creation-studio/book/ai',
    },
    {
        path: '/creation',
        name: 'creation',
        component: () =>
            import ( /* webpackChunkName: "mycreation" */ '../views/Creation.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/books/',
        name: 'books',
        component: () =>
            import ( /* webpackChunkName: "original-books" */ '../views/OriginalBooks.vue'),
        meta: { seoTitle: '原创绘本' }
    },
    {
        path: '/search-books/',
        name: 'search-books',
        component: () =>
            import ( /* webpackChunkName: "search-books" */ '../views/SearchBooks.vue'),
        meta: { seoTitle: '搜索绘本' }
    },
    {
        path: '/illustration',
        name: 'illustration',
        component: () =>
            import ( /* webpackChunkName: "classic-books" */ '../views/OriginalIllustration.vue'),
        meta: { seoTitle: '原创插画' }
    },
    {
        path: '/websites',
        name: 'website-recommendations',
        component: () =>
            import ( /* webpackChunkName: "website-reco" */ '../views/WebsiteRecommendations.vue'),
        meta: { seoTitle: '网站推荐' }
    },
    {
        path: '/blog',
        name: 'blog',
        component: () =>
            import ( /* webpackChunkName: "blog" */ '../views/BlogList.vue'),
        meta: { seoTitle: '博客' }
    },
    {
        path: '/blog/:slug',
        name: 'blog-post',
        component: () =>
            import ( /* webpackChunkName: "blog-post" */ '../views/BlogPost.vue'),
        props: true,
    },
    {
        path: '/books/:bookId',
        name: 'bookdetails',
        component: () =>
            import ( /* webpackChunkName: "book-details" */ '../views/OriginalBookdetails.vue'),
        props: true,
    },

    {
        path: '/illustration/:illId',
        name: 'illusdetails',
        component: () =>
            import ( /* webpackChunkName: "book-details" */ '../views/OriginalIllusdetails.vue'),
        props: true,
    },

    {
        path: '/connection',
        name: 'connection',
        component: () =>
            import ( /* webpackChunkName: "guides" */ '../views/GuidesHub.vue'),
        meta: { seoTitle: '创作指南' }
    },
    {
        path: '/feedback',
        name: 'feedback',
        component: () =>
            import(/* webpackChunkName: "feedback" */ '../views/Feedback.vue'),
        meta: { seoTitle: '投诉建议', requiresAuth: true },
    },
    {
        path: '/guides',
        redirect: '/connection',
    },
    {
        path: '/creator-program',
        name: 'creator-program',
        component: () =>
            import ( /* webpackChunkName: "creator-program" */ '../views/CreatorProgram.vue'),
        meta: { seoTitle: '创作者计划' }
    },
    {
        path: '/prompt-fill',
        name: 'prompt-fill',
        component: () =>
            import ( /* webpackChunkName: "prompt-fill" */ '../views/PromptFill.vue'),
        meta: { seoTitle: '提示词填充' }
    },

    {
        path: '/user',
        redirect: (to) => {
            const tab = to.query.tab;
            if (tab === '2' || tab === 2) return '/creation-studio/character';
            if (tab === '3' || tab === 3) return '/creation-studio/illustration/mine';
            if (tab === '4' || tab === 4) return '/creation-studio/book/mine';
            return '/user/profile';
        },
    },

    {
        path: '/user/profile',
        name: 'profile',
        component: () =>
            import ( /* webpackChunkName: "my-information" */ '../views/UserProfile.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/user/about',
        name: 'about-us',
        component: () =>
            import(/* webpackChunkName: "about-us" */ '../views/AboutUs.vue'),
        meta: {
            requiresAuth: true,
            seoTitle: '关于我们',
        },
    },
    {
        path: '/user/upload',
        name: 'upload',
        component: () =>
            import ( /* webpackChunkName: "upload" */ '../views/Upload.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/user/upload/submit-res',
        name: 'upload-production',
        component: () =>
            import ( /* webpackChunkName: "upload-production" */ '../views/SubmitRes.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/user/upload/upload-illustration',
        name: 'upload-illustration',
        component: () =>
            import ( /* webpackChunkName: "upload-illustration" */ '../views/UploadIllustration.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/user/upload/editionillus/:illId',
        name: 'edition-illus',
        component: () =>
            import ( /* webpackChunkName: "edition-illus" */ '../views/EditionIll.vue'),
        meta: {
            requiresAuth: true
        },
        props: true,
    },
    {
        path: '/user/upload/editionbook/:bookId',
        name: 'edition-book',
        component: () =>
            import ( /* webpackChunkName: "edition-book" */ '../views/EditionBook.vue'),
        meta: {
            requiresAuth: true
        },
        props: true,
    },
    {
        path: '/user/upload/edition-success',
        name: 'edition-success',
        component: () =>
            import ( /* webpackChunkName: "edition-success" */ '../views/EditionRes.vue'),
        meta: {
            requiresAuth: true
        },
        props: true,
    },
    {
        path: '/user/upload/upload-local-book',
        name: 'upload-local-book',
        component: () =>
            import ( /* webpackChunkName: "upload-local-book" */ '../views/UploadLocalBook.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/user/upload/compose-illustration/topdf',
        redirect: '/creation-studio/book/topdf',
    },
    {
        path: '/user/upload/compose-illustration',
        redirect: '/creation-studio/book/compose',
    },
    {
        path: '/user/upload/upload-loacl-pdf',
        name: 'add-local-pdf',
        component: () =>
            import ( /* webpackChunkName: "add-local-pdf" */ '../views/UploadLocalPdf.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/user/upload/upload-element',
        name: 'add-element',
        component: () =>
            import ( /* webpackChunkName: "add-element" */ '../views/UploadElement.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/user/upload/style-prompt',
        name: 'upload-style-prompt',
        component: () =>
            import ( /* webpackChunkName: "upload-style-prompt" */ '../views/UploadStylePrompt.vue'),
        meta: {
            requiresAuth: true,
            requiresAdmin: true,
            seoTitle: '上传 AI 风格'
        }
    },
    {
        path: '/user/upload/website-recommendations',
        name: 'upload-website-recommendations',
        component: () =>
            import ( /* webpackChunkName: "upload-website-reco" */ '../views/UploadWebsiteRecommendation.vue'),
        meta: {
            requiresAuth: true,
            requiresAdmin: true,
            seoTitle: '上传网站推荐'
        }
    },
    {
        path: '/user/upload/style-transfer',
        name: 'style-transfer',
        component: () =>
            import ( /* webpackChunkName: "style-transfer" */ '../views/StyleTransfer.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/creation-studio',
        component: () =>
            import(/* webpackChunkName: "creation-studio-layout" */ '../views/CreationStudioLayout.vue'),
        meta: {
            requiresAuth: true,
            seoTitle: '创作工作台',
        },
        redirect: '/creation-studio/character',
        children: [
            {
                path: 'character',
                name: 'character-studio',
                component: () =>
                    import(/* webpackChunkName: "character-studio" */ '../views/CharacterStudioDashboard.vue'),
                meta: { creationDomain: 'character', seoTitle: '我的角色' },
            },
            {
                path: 'character/generate/:characterId?',
                name: 'character-studio-workbench',
                component: () =>
                    import(/* webpackChunkName: "character-studio-workbench" */ '../views/CharacterStudioWorkbench.vue'),
                props: true,
                meta: { creationDomain: 'character', seoTitle: '生成角色' },
            },
            {
                path: 'character/groups',
                name: 'create-group-images',
                component: () =>
                    import(/* webpackChunkName: "create-group-images" */ '../views/CreateGroupImages.vue'),
                meta: { creationDomain: 'character', requiresAuth: true },
            },
            {
                path: 'illustration/ai',
                name: 'AIPicture',
                component: () =>
                    import(/* webpackChunkName: "ai-picture" */ '../views/AIpicture.vue'),
                meta: { creationDomain: 'illustration', requiresAuth: true },
            },
            {
                path: 'illustration/multi-character',
                name: 'multi-character-scene',
                component: () =>
                    import(/* webpackChunkName: "multi-character-scene" */ '../views/MultiCharacterScene.vue'),
                meta: {
                    creationDomain: 'illustration',
                    requiresAuth: true,
                    seoTitle: '多角色插画',
                },
            },
            {
                path: 'illustration/mine',
                name: 'my-illustrations',
                component: () =>
                    import(/* webpackChunkName: "my-illustrations-studio" */ '../views/MyIllustrationsStudio.vue'),
                meta: { creationDomain: 'illustration', requiresAuth: true, seoTitle: '我的插画' },
            },
            {
                path: 'book/ai',
                name: 'AIbooks',
                component: () =>
                    import(/* webpackChunkName: "ai-books" */ '../views/AIBooks.vue'),
                meta: { creationDomain: 'book', requiresAuth: true },
            },
            {
                path: 'book/compose',
                name: 'compose-illustration',
                component: () =>
                    import(/* webpackChunkName: "compose-illustration" */ '../views/ComposeIllustration.vue'),
                meta: { creationDomain: 'book', requiresAuth: true },
            },
            {
                path: 'book/topdf',
                name: 'topdf',
                component: () =>
                    import(/* webpackChunkName: "topdf" */ '../views/ToPdf.vue'),
                meta: { creationDomain: 'book', requiresAuth: true },
            },
            {
                path: 'book/print-layout',
                redirect: '/creation-studio/book/topdf',
            },
            {
                path: 'book/mine',
                name: 'my-books',
                component: () =>
                    import(/* webpackChunkName: "my-books-studio" */ '../views/MyBooksStudio.vue'),
                meta: { creationDomain: 'book', requiresAuth: true, seoTitle: '我的绘本' },
            },
        ],
    },
    {
        path: '/character-studio',
        redirect: '/creation-studio/character',
    },
    {
        path: '/character-studio/workbench/:characterId?',
        redirect: (to) => ({
            path: `/creation-studio/character/generate/${to.params.characterId || 'new'}`,
        }),
    },
    {
        path: '/create-character',
        name: 'create-character',
        redirect: '/creation-studio/character/generate/new',
        meta: { requiresAuth: true },
    },
    {
        path: '/create-group-images',
        redirect: '/creation-studio/character/groups',
    },
    {
        path: '/character-group-images/:characterId',
        name: 'character-group-images',
        component: () =>
            import ( /* webpackChunkName: "character-group-images" */ '../views/CharacterGroupImages.vue'),
        meta: {
            requiresAuth: true
        },
        props: true
    },
    {
        path: '/create-layout-illustration',
        name: 'create-layout-illustration',
        component: () =>
            import(/* webpackChunkName: "create-layout-illustration" */ '../views/CreateLayoutIllustration.vue'),
        meta: {
            requiresAuth: true,
        },
    },
    {
        path: '/creation-studio/illustration/layout',
        redirect: '/create-layout-illustration',
    },
    {
        path: '/creation-studio/illustration/editor',
        redirect: '/editorpro',
    },
    {
        path: '/print-book-layout',
        name: 'print-book-layout',
        redirect: '/creation-studio/book/topdf',
    },
    {
        path: '/editorpro',
        name: 'editorpro',
        component: () =>
            import(/* webpackChunkName: "editorpro" */ '../views/Editorpro.vue'),
        meta: {
            requiresAuth: false,
            seoTitle: '在线插画编辑',
        },
    },
    {
        path: '/diary-timeline',
        name: 'diary-timeline',
        component: () =>
            import(/* webpackChunkName: "diary-timeline" */ '../views/DiaryTimeline.vue'),
        meta: {
            requiresAuth: true,
            seoTitle: '日记时间线',
        },
    },
    {
        path: '/creation-studio/illustration/diary-timeline',
        redirect: '/diary-timeline',
    },
    {
        path: '/lasso-crop',
        name: 'lasso-crop',
        component: () =>
            import ( /* webpackChunkName: "lasso-crop" */ '../views/LassoCropPage.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/image-segmentation',
        name: 'image-segmentation',
        component: () =>
            import(/* webpackChunkName: "image-segmentation" */ '../views/ImageSegmentationPage.vue'),
        meta: {
            requiresAuth: true,
            seoTitle: '图像分割',
        },
    },
    {
        path: '/childhood',
        name: 'childhood',
        component: () =>
            import ( /* webpackChunkName: "childhood" */ '../views/Childhood.vue'),
        meta: {
            seoTitle: '幸福童年收集',
        },
    },
    {
        path: '/newyear',
        redirect: '/childhood',
    },
    {
        path: '/newyear/gallery',
        redirect: '/childhood',
    },
    {
        path: '/childhood/gallery',
        redirect: '/childhood',
    },
    {
        path: '/national-day',
        name: 'national-day',
        component: () =>
            import ( /* webpackChunkName: "national-day" */ '../views/NationalDay.vue'),
        meta: {
            seoTitle: '国庆感受收集',
        },
    },
    {
        path: '/guoqing',
        redirect: '/national-day',
    },
    {
        path: '/mood-diary',
        component: () =>
            import ( /* webpackChunkName: "mood-diary-shell" */ '../views/mood-diary/MoodDiaryShell.vue'),
        meta: {
            requiresAuth: false
        },
        redirect: '/mood-diary/narrative',
        children: [
            {
                path: 'narrative',
                name: 'mood-diary-narrative',
                component: () =>
                    import ( /* webpackChunkName: "mood-diary-narrative" */ '../views/mood-diary/MoodDiaryNarrative.vue'),
                meta: { seoTitle: '心情日记' }
            },
            {
                path: 'write',
                redirect: (to) => ({
                    path: '/mood-diary/narrative',
                    query: { ...to.query, write: '1' }
                })
            },
            {
                path: 'generate',
                name: 'mood-diary-generate',
                component: () =>
                    import ( /* webpackChunkName: "mood-diary-generate" */ '../views/mood-diary/MoodDiaryGenerate.vue')
            },
            {
                path: 'memory-journal',
                name: 'mood-diary-memory-journal',
                component: () =>
                    import ( /* webpackChunkName: "mood-diary-memory-journal" */ '../views/mood-diary/MoodDiaryMemoryJournal.vue'),
                meta: { seoTitle: '长文日记' }
            },
            {
                path: 'book',
                name: 'mood-diary-book',
                component: () =>
                    import ( /* webpackChunkName: "mood-diary-book" */ '../views/mood-diary/MoodDiaryBook.vue')
            },
            {
                path: 'recap',
                name: 'mood-diary-recap',
                component: () =>
                    import ( /* webpackChunkName: "mood-diary-recap" */ '../views/mood-diary/MoodDiaryRecap.vue')
            },
            {
                path: 'share-poster',
                name: 'mood-diary-share-poster',
                component: () =>
                    import ( /* webpackChunkName: "mood-diary-share-poster" */ '../views/mood-diary/MoodDiarySharePoster.vue')
            }
        ]
    },
    {
        path: '/admin', redirect: '/admin/books',
    },
    {
        path: '/admin/books', name: 'admin-books',
        component: () => import(/* webpackChunkName: "admin-books" */ '../views/AdminBooks.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, seoTitle: '绘本审核 · 管理后台' },
    },
    {
        path: '/admin/rewards', name: 'admin-rewards',
        component: () => import(/* webpackChunkName: "admin-books" */ '../views/AdminBooks.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, seoTitle: '积分奖励 · 管理后台' },
    },
    {
        path: '/member/recharge',
        name: 'member-recharge',
        component: () =>
            import ( /* webpackChunkName: "member-recharge" */ '../views/MemberRecharge.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/member/recharge/success',
        name: 'member-recharge-success',
        component: () =>
            import ( /* webpackChunkName: "member-recharge-success" */ '../views/MemberRechargeSuccess.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/member/points-history',
        name: 'points-history',
        component: () =>
            import(/* webpackChunkName: "points-history" */ '../views/PointsHistory.vue'),
        meta: {
            requiresAuth: true,
            seoTitle: '积分明细',
        },
    },
    {
        path: '/member/generation-history',
        name: 'generation-history',
        component: () =>
            import(/* webpackChunkName: "generation-history" */ '../views/GenerationHistory.vue'),
        meta: {
            requiresAuth: true,
            seoTitle: '生成历史',
        },
    },
    {
        path: '/user-g/:authorId',
        name: 'user-g',
        component: () =>
            import ( /* webpackChunkName: "user" */ '../views/UserG.vue'),
        props: true,
    },

    {
        path: '/user/savedraft',
        name: 'savedraft',
        component: () =>
            import ( /* webpackChunkName: "savedraft" */ '../views/SaveDraft.vue'),
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/user/book/:bookId',
        name: 'user-bookdetails',
        component: () =>
            import ( /* webpackChunkName: "mybook-details" */ '../views/MyBookDetails.vue'),
        meta: {
            requiresAuth: true
        },
        props: true,
    },
    {
        path: '/user/illustration/:illId',
        name: 'user-illusdetails',
        component: () =>
            import ( /* webpackChunkName: "myillus-details" */ '../views/MyIllusDetails.vue'),
        meta: {
            requiresAuth: true
        },
        props: true,
    },
    {
        path: '/user/collect-books/:bookId',
        name: 'collect-bookdetails',
        component: () =>
            import ( /* webpackChunkName: "book-details" */ '../views/MyCoBookDetails.vue'),
        props: true,
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: () => import(/* webpackChunkName: "forgot-password" */ '../views/ForgotPassword.vue')
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () =>
            import ( /* webpackChunkName: "notFound" */ '../views/NotFound.vue'),
    },



]

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
})

router.afterEach((to) => {
    applyRouteSeo(to)
})

router.beforeEach((to, from, next) => {
    if (to.matched.some(record => record.meta.requiresAuth)) {
        const token = localStorage.getItem("token")
        const cango = (to.name == 'Home' || to.name == 'books' || to.name == 'illustration' || to.name == 'connection')
        if ((!token || token == "undefined") && (!cango)) {
            if (to.path === '/creation-studio/book/ai' || to.path === '/creation-studio/book/topdf') {
                try { sessionStorage.setItem('kidstory-pending-creation', to.fullPath) } catch { /* storage optional */ }
            }
            store.state.isMask = true
            next(false)
            return
        }
    }
    if (to.matched.some(record => record.meta.requiresAdmin) && !isCurrentUserAdmin()) {
        next({ path: '/user/upload', replace: true })
        return
    }
    next()
})

router.onError((error) => {
    const msg = error?.message || ''
    if (!isChunkLoadErrorMessage(msg)) return
    reloadForStaleChunks()
})

export default router

