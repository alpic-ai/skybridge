import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import GitHubStars from '@site/src/components/GitHubStars';

// Add custom component type for GitHub Stars
(ComponentTypes as any)['custom-github-stars'] = GitHubStars;

export default ComponentTypes;

