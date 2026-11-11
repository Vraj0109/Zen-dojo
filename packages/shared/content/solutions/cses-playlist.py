from typing import List

class Solution:
    def playlist(self, songs: List[int]) -> int:
        last_pos = {}
        left = 0
        best = 0
        for right, s in enumerate(songs):
            if s in last_pos and last_pos[s] >= left:
                left = last_pos[s] + 1
            last_pos[s] = right
            best = max(best, right - left + 1)
        return best
