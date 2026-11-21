from typing import List

class Solution:
    def restaurantCustomers(self, customers: List[List[int]]) -> int:
        max_overlap = 0
        for c1 in customers:
            arrival = c1[0]
            count = sum(1 for c2 in customers if c2[0] <= arrival <= c2[1])
            if count > max_overlap:
                max_overlap = count
        return max_overlap
