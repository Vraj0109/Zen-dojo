from typing import List

class Solution:
    def apartments(self, applicants: List[int], apartments: List[int], k: int) -> int:
        applicants.sort()
        apartments.sort()
        i, j, matched = 0, 0, 0
        while i < len(applicants) and j < len(apartments):
            if apartments[j] < applicants[i] - k:
                j += 1
            elif apartments[j] > applicants[i] + k:
                i += 1
            else:
                matched += 1
                i += 1
                j += 1
        return matched
