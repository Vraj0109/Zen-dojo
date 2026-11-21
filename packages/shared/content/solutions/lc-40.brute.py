class Solution:
    def combinationSum2(self, candidates: list[int], target: int) -> list[list[int]]:
        candidates.sort()
        res = set()
        n = len(candidates)

        def backtrack(idx: int, cur_sum: int, cur: list[int]) -> None:
            if cur_sum == target:
                res.add(tuple(cur))
                return
            if cur_sum > target or idx == n:
                return

            # Include
            cur.append(candidates[idx])
            backtrack(idx + 1, cur_sum + candidates[idx], cur)
            cur.pop()

            # Exclude
            backtrack(idx + 1, cur_sum, cur)

        backtrack(0, 0, [])
        return [list(t) for t in res]
