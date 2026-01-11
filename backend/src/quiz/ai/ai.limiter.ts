import Bottleneck from 'bottleneck';

// Bottlenecking to prevent api call abuse
export const aiLimiter = new Bottleneck({
  maxConcurrent: 4,
  minTime: 300,
});
