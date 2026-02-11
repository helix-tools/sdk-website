import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Helix SDK Documentation',
  tagline: 'Official SDKs for the Helix Connect Data Marketplace',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://dev.helix.tools',
  baseUrl: '/',

  organizationName: 'helix-tools',
  projectName: 'sdk-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/helix-tools/sdk-docs/tree/main/',
          routeBasePath: '/', // Docs at root
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/helix-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Helix SDK',
      logo: {
        alt: 'Helix Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'sdkSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://helix.tools',
          label: 'Helix Connect',
          position: 'right',
        },
        {
          href: 'https://github.com/helix-tools',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'SDKs',
          items: [
            {
              label: 'TypeScript',
              to: '/typescript/installation',
            },
            {
              label: 'Python',
              to: '/python/installation',
            },
            {
              label: 'Go',
              to: '/go/installation',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Helix Connect',
              href: 'https://helix.tools',
            },
            {
              label: 'API Reference',
              href: 'https://api.helix.tools/docs',
            },
            {
              label: 'Status',
              href: 'https://status.helix.tools',
            },
          ],
        },
        {
          title: 'Support',
          items: [
            {
              label: 'GitHub Issues',
              href: 'https://github.com/helix-tools/sdk-docs/issues',
            },
            {
              label: 'Email Support',
              href: 'mailto:support@helix.tools',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Helix Tools. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'python', 'go', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
