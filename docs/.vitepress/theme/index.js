import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import Footer from './components/Footer.vue';
import './theme.css';

export default {
    extends: DefaultTheme,
    Layout() {
        return h(DefaultTheme.Layout, null, {
            'layout-bottom': () => h(Footer),
        });
    },
};
