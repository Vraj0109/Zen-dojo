class Solution:
    def describeMoose(self, left: int, right: int) -> str:
        if left == 0 and right == 0:
            return "Not a moose"
        if left == right:
            return f"Even {left * 2}"
        return f"Odd {max(left, right) * 2}"
