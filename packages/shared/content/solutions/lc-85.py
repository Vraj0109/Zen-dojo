from typing import List

class Solution:
    def maximalRectangle(self, matrix: List[List[str]]) -> int:
        if not matrix or not matrix[0]:
            return 0

        def largest_rectangle_area(heights: List[int]) -> int:
            h = heights + [0]
            st = []
            max_area = 0
            for i, val in enumerate(h):
                while st and h[st[-1]] >= val:
                    height = h[st.pop()]
                    width = i if not st else i - st[-1] - 1
                    max_area = max(max_area, height * width)
                st.append(i)
            return max_area

        cols = len(matrix[0])
        heights = [0] * cols
        max_area = 0
        for row in matrix:
            for c in range(cols):
                if row[c] == '1':
                    heights[c] += 1
                else:
                    heights[c] = 0
            max_area = max(max_area, largest_rectangle_area(heights))
        return max_area
