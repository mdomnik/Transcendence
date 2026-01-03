import Bottleneck from 'bottleneck';

export const aiLimiter = new Bottleneck({
  maxConcurrent: 4,
  minTime: 300,
});
