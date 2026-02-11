import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  sdkSidebar: [
    'intro',
    {
      type: 'category',
      label: 'TypeScript SDK',
      collapsed: false,
      items: [
        'typescript/installation',
        'typescript/consumer',
        'typescript/producer',
      ],
    },
    {
      type: 'category',
      label: 'Python SDK',
      collapsed: false,
      items: [
        'python/installation',
        'python/usage',
      ],
    },
    {
      type: 'category',
      label: 'Go SDK',
      collapsed: false,
      items: [
        'go/installation',
        'go/usage',
      ],
    },
  ],
};

export default sidebars;
