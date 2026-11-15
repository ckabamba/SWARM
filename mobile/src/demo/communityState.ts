import { CommunityPost } from '../services/warmPathApi';
import { DEMO_POSTS } from './fixtures';

let demoPosts = [...DEMO_POSTS];

export function getDemoPosts() {
  return [...demoPosts];
}

export function setDemoPosts(posts: CommunityPost[]) {
  demoPosts = [...posts].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
  return getDemoPosts();
}
