from typing import List

class Solution:
    def generateFizzBuzz(self, x: int, y: int, n: int) -> List[str]:
        ans = []
        for i in range(1, n + 1):
            fx = (i % x == 0)
            fy = (i % y == 0)
            if fx and fy:
                ans.append("FizzBuzz")
            elif fx:
                ans.append("Fizz")
            elif fy:
                ans.append("Buzz")
            else:
                ans.append(str(i))
        return ans
