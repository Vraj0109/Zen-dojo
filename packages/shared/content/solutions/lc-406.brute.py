class Solution:
    def reconstructQueue(self, people: list[list[int]]) -> list[list[int]]:
        n = len(people)
        res = [None] * n
        # Sort ascending by height, ties descending by k
        p = sorted(people, key=lambda x: (x[0], -x[1]))
        for person in p:
            h, k = person[0], person[1]
            count = 0
            for i in range(n):
                if res[i] is None:
                    if count == k:
                        res[i] = person
                        break
                    count += 1
        return res
