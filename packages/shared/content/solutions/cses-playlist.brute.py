from typing import List

class Solution:
    def playlist(self, songs: List[int]) -> int:
        last_pos = {}
        left = 0
        best = 0
        for right, song in enumerate(songs):
            if song in last_pos and last_pos[song] >= left:
                left = last_pos[song] + 1
            last_pos[song] = right
            if right - left + 1 > best:
                best = right - left + 1
        return best
