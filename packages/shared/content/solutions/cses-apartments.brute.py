from typing import List

class Solution:
    def apartments(self, applicants: List[int], apartments: List[int], k: int) -> int:
        applicants.sort()
        apartments.sort()
        i = j = count = 0
        while i < len(applicants) and j < len(apartments):
            if abs(applicants[i] - apartments[j]) <= k:
                count += 1
                i += 1
                j += 1
            elif applicants[i] < apartments[j]:
                i += 1
            else:
                j += 1
        return count
