<script setup>
    import { useData, withBase } from 'vitepress';
    import { useLayout } from 'vitepress/theme';

    const { site, theme } = useData();
    const { hasSidebar } = useLayout();
</script>

<template>
    <footer class="site-footer" :class="{ 'has-sidebar': hasSidebar }">
        <div class="container site-footer-main">
            <div class="site-footer-brand">
                <a class="site-footer-title" :href="withBase('/')">{{ site.title }}</a>
                <a class="site-footer-by" href="https://www.chialab.it" target="_blank" rel="noreferrer">
                    by <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76.61 9.22"><path fill="#ef7d00" d="M16.45,4.62v1.25h-3.37c-.12.49-.37.99-.75,1.49-.38.51-.94.94-1.69,1.31-.74.36-1.67.55-2.77.55-1.34,0-2.46-.27-3.36-.81s-1.65-1.22-2.26-2.05c-.3.42-.52.82-.65,1.2-.13.38-.19.78-.19,1.2H.01c0-.62.13-1.24.38-1.87.26-.63.64-1.18,1.15-1.64-.6-.83-1.01-1.66-1.22-2.48-.21-.82-.32-1.74-.32-2.77h1.4c0,.78.06,1.48.19,2.09.12.61.37,1.3.74,2.09.58-.64,1.35-1.18,2.29-1.63.94-.44,2.01-.67,3.21-.67,1.03,0,1.92.15,2.67.45s1.33.66,1.75,1.09c.42.42.69.82.82,1.2,0,0,3.38,0,3.38,0ZM10.26,5.92c.18-.16.28-.39.28-.69s-.09-.52-.28-.68-.43-.25-.73-.25-.54.08-.73.25-.28.4-.28.68.09.53.28.69.43.25.73.25.55-.08.73-.25Z"></path><path fill="currentcolor" d="M25.97,6.25c-.11.85-.46,1.51-1.03,1.99-.58.48-1.3.71-2.18.71-.66,0-1.24-.15-1.75-.44s-.9-.7-1.18-1.22c-.28-.52-.41-1.11-.41-1.76s.14-1.24.42-1.76c.28-.52.68-.92,1.19-1.21s1.1-.43,1.76-.43c.57,0,1.08.1,1.53.31.45.2.82.49,1.1.87.28.38.45.81.5,1.31h-1.7c-.05-.38-.2-.67-.46-.88s-.58-.31-.97-.31c-.51,0-.92.18-1.22.55-.3.37-.46.89-.46,1.57s.16,1.2.47,1.55c.32.36.72.53,1.22.53.43,0,.77-.12,1.03-.35.25-.23.4-.58.44-1.03,0,0,1.7,0,1.7,0Z"></path><path fill="currentcolor" d="M28,8.76V0h1.67v2.09l-.05,1.21h.08c.38-.78,1.06-1.18,2.04-1.18.84,0,1.46.26,1.85.77.4.52.59,1.17.59,1.97v3.89h-1.67v-3.55c0-.54-.11-.95-.33-1.24-.22-.29-.55-.43-1-.43-.5,0-.88.18-1.14.55-.26.37-.4.9-.4,1.58v3.08h-1.66l.02.02Z"></path><path fill="currentcolor" d="M43.03,8.76h-6.77v-1.28h2.74l.08-.08v-3.67l-.08-.08h-2.24v-1.28h3.82l.17.17v4.87l.08.08h2.21v1.28h0ZM38.89,1.46l-.07-.07V.07L38.89,0h1.6l.08.07v1.32l-.08.07s-1.6,0-1.6,0Z"></path><path fill="currentcolor" d="M47.21,4.99c.41-.06.87-.09,1.39-.11.26-.02.37-.02.35-.02v-.37c0-.36-.1-.64-.31-.84-.21-.2-.5-.3-.89-.3-.36,0-.65.09-.88.27s-.35.41-.38.7h-1.62c0-.34.09-.68.28-1.01.18-.33.49-.61.92-.84.43-.23.99-.34,1.67-.34.97,0,1.68.23,2.14.69s.69,1.03.69,1.72v2.22l1.04,1.27-1.13.97-1.22-1.27h-.08c-.56.82-1.31,1.22-2.24,1.22-.62,0-1.15-.17-1.57-.5-.42-.34-.63-.81-.63-1.42,0-1.15.82-1.83,2.47-2.04h0ZM46.62,7.46c.18.14.42.2.73.2s.58-.07.83-.2.44-.31.58-.53c.14-.22.2-.45.2-.7v-.46c-.47.03-.89.07-1.26.12-.47.06-.81.16-1.03.32s-.32.38-.32.65.09.46.27.6Z"></path><path fill="currentcolor" d="M59.72,8.76h-6.68v-1.28h2.62l.08-.08V1.37l-.08-.08h-2.27V0h3.85l.17.17v7.22l.08.08h2.23v1.28h0Z"></path><path fill="currentcolor" d="M64.01,4.99c.41-.06.87-.09,1.39-.11.26-.02.37-.02.35-.02v-.37c0-.36-.1-.64-.31-.84-.21-.2-.5-.3-.89-.3-.36,0-.65.09-.88.27s-.35.41-.38.7h-1.62c0-.34.09-.68.28-1.01.18-.33.49-.61.92-.84.43-.23.99-.34,1.67-.34.97,0,1.68.23,2.14.69s.69,1.03.69,1.72v2.22l1.04,1.27-1.13.97-1.22-1.27h-.08c-.56.82-1.31,1.22-2.24,1.22-.62,0-1.15-.17-1.57-.5-.42-.34-.63-.81-.63-1.42,0-1.15.82-1.83,2.47-2.04ZM63.42,7.46c.18.14.42.2.73.2s.58-.07.83-.2.44-.31.58-.53c.14-.22.2-.45.2-.7v-.46c-.47.03-.89.07-1.26.12-.47.06-.81.16-1.03.32s-.32.38-.32.65.09.46.27.6Z"></path><path fill="currentcolor" d="M69.88,8.76V0h1.67v2.1l-.02,1.13h.08c.19-.33.46-.59.8-.8.34-.2.76-.31,1.27-.31.54,0,1.03.12,1.47.37.44.25.8.62,1.06,1.12s.4,1.11.4,1.84-.13,1.38-.4,1.91c-.26.53-.62.92-1.06,1.19-.44.26-.92.4-1.45.4s-.96-.12-1.33-.35c-.37-.23-.62-.5-.76-.82h-.08l-.16.97h-1.49ZM74.44,7.04c.3-.34.46-.85.46-1.51s-.15-1.17-.46-1.52c-.3-.35-.71-.53-1.22-.53s-.89.17-1.2.5c-.31.33-.47.82-.47,1.46v.2c0,.6.15,1.07.46,1.4.3.34.71.5,1.21.5s.92-.17,1.22-.52v.02Z"></path></svg>
                </a>
                <p class="site-footer-tagline">
                    {{ theme.footer?.message }}
                </p>
            </div>
        </div>

        <div class="container site-footer-bottom" v-if="theme.footer?.copyright">
            {{ theme.footer.copyright }}
        </div>
    </footer>
</template>

<style scoped>
    .site-footer {
        position: relative;
        z-index: var(--vp-z-index-footer);
        font-size: 0.8125rem;
        background: oklch(0.145 0 0);
        color: oklch(0.705 0.015 286.067);
    }

    .site-footer-main {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        margin: 0 auto;
        padding-top: 1.5rem;
        padding-bottom: 1.5rem;
    }

    .site-footer-title {
        font-size: 1rem;
        font-weight: 600;
    }

    .site-footer-brand {
        display: flex;
        flex-direction: column;
        max-width: 380px;
    }

    .site-footer-by {
        display: flex;
        align-items: baseline;
        gap: 6px;
        color: oklch(0.552 0.016 285.938);
        text-decoration: none;
    }

    .site-footer-by svg {
        display: block;
        height: 0.75em;
    }

    .site-footer-tagline {
        margin: 4px 0 0;
        font-size: 0.875rem;
        line-height: 1.6;
    }

    .site-footer-bottom {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        margin: 0 auto;
        padding-top: 1rem;
        padding-bottom: 1rem;
        color: oklch(0.552 0.016 285.938);
        border-top: 1px solid oklch(0.269 0 0);
    }
</style>
