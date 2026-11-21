import heapq
from collections import deque

class Solution:
    def leastInterval(self, tasks: list[str], n: int) -> int:
        if n == 0:
            return len(tasks)
        cnt = [0] * 26
        for t in tasks:
            cnt[ord(t[0]) - ord('A')] += 1
        pq = [-c for c in cnt if c > 0]
        heapq.heapify(pq)
        
        time = 0
        cool = deque() # (count, availableTime)

        while pq or cool:
            time += 1
            if cool and cool[0][1] <= time:
                c, _ = cool.popleft()
                heapq.heappush(pq, c)
            if pq:
                c = heapq.heappop(pq)
                # c is negative
                rem = (-c) - 1
                if rem > 0:
                    cool.append((-rem, time + n + 1))
        return time
