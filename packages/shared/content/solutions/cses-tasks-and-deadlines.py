from typing import List

class Solution:
    def tasksAndDeadlines(self, tasks: List[List[int]]) -> int:
        tasks.sort(key=lambda t: t[0])
        current_time = 0
        total_reward = 0
        for duration, deadline in tasks:
            current_time += duration
            total_reward += deadline - current_time
        return total_reward
