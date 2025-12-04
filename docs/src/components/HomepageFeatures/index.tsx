import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
  icon: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Full Agentic App Support',
    icon: '⚡',
    description: (
      <>
        Build your app once and make ChatGPT & MCP apps compatible.
      </>
    ),
  },
  {
    title: 'Simplified Dev Experience',
    icon: '💻',
    description: (
      <>
        The comfort of a modern development experience: type-safe, Hot Module Reload, and more!
      </>
    ),
  },
  {
    title: 'Composable Architecture',
    icon: '🔗',
    description: (
      <>
        Skybridge brings together a set of libraries to help you build your app while giving you the freedom to choose your own tools.
      </>
    ),
  },
];

function Feature({title, description, icon}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureIcon}>{icon}</div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
