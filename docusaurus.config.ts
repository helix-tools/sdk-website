import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Helix SDK Documentation',
  tagline: 'Official SDKs for the Helix Connect Data Marketplace',
  favicon: 'img/favicon.svg',

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
          to: '/common-patterns',
          label: 'Recipes',
          position: 'left',
        },
        {
          to: '/troubleshooting',
          label: 'Troubleshooting',
          position: 'left',
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
              label: 'TypeScript SDK',
              to: '/typescript/installation',
            },
            {
              label: 'Python SDK',
              to: '/python/installation',
            },
            {
              label: 'Go SDK',
              to: '/go/installation',
            },
          ],
        },
        {
          title: 'Guides',
          items: [
            {
              label: 'Getting Started',
              to: '/',
            },
            {
              label: 'Common Patterns',
              to: '/common-patterns',
            },
            {
              label: 'Troubleshooting',
              to: '/troubleshooting',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Helix Connect Platform',
              href: 'https://helix.tools',
            },
            {
              label: 'API Reference',
              href: 'https://api.helix.tools/docs',
            },
            {
              label: 'Status Page',
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
            {
              label: 'Security',
              href: 'mailto:security@helix.tools',
            },
          ],
        },
      ],
      logo: {
        alt: 'Helix Tools Logo',
        src: 'img/logo.svg',
        href: 'https://helix.tools',
        width: 50,
        height: 50,
      },
      copyright: `Copyright © ${new Date().getFullYear()} Helix Tools, Inc. All rights reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'python', 'go', 'json', 'yaml'],
    },
    // Announcement bar for important updates
    // announcementBar: {
    //   id: 'v2_announcement',
    //   content: '🎉 SDK v2.0 is now available! <a href="/changelog">See what\'s new</a>',
    //   backgroundColor: '#6366f1',
    //   textColor: '#fff',
    //   isCloseable: true,
    // },
  } satisfies Preset.ThemeConfig,
};

export default config;
