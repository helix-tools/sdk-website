import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  sdkSidebar: [
    'intro',
    'common-patterns',
    'troubleshooting',
    {
      type: 'category',
      label: 'TypeScript SDK',
      collapsed: false,
      items: [
        'typescript/installation',
        'typescript/consumer',
        'typescript/producer',
        'typescript/admin',
      ],
    },
    {
      type: 'category',
      label: 'Python SDK',
      collapsed: false,
      items: [
        'python/installation',
        'python/usage',
        'python/advanced',
      ],
    },
    {
      type: 'category',
      label: 'Go SDK',
      collapsed: false,
      items: [
        'go/installation',
        'go/usage',
        'go/advanced',
      ],
    },
  ],
};

export default sidebars;
