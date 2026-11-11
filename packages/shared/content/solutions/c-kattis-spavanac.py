from typing import List

class Solution:
    def alarmEarlier(self, h: int, m: int) -> List[int]:
        t = (h * 60 + m - 45 + 1440) % 1440
        return [t // 60, t % 60]
