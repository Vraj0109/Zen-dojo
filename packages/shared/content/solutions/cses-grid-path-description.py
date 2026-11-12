class Solution:
    def gridPathDescription(self, description: str) -> int:
        # 7x7 board inside a 9-wide frame of visited sentinels; cell (r, c) is r * 9 + c.
        d = description
        vis = [1] * 81
        for r in range(1, 8):
            b = r * 9
            for c in range(1, 8):
                vis[b + c] = 0

        ch_k = {'U': -9, 'D': 9, 'L': -1, 'R': 1}
        p = [0 if c == '?' else ch_k[c] for c in d]

        if p[47] == -9 or p[47] == 1 or p[0] == -9 or p[0] == -1:
            return 0

        # Many different routes reach the same set of visited cells at the same square. After step MEMO_STEP the number of
        # ways to finish depends only on that state, so it is remembered (the description is fixed, so the step follows from
        # the number of visited cells).
        memo = {}
        MEMO_STEP = 29

        def go(step: int, pos: int, mask: int) -> int:
            if pos == 64:
                return 1 if step == 48 else 0
            if step == 48:
                return 0

            key = 0
            if step == MEMO_STEP:
                key = mask * 81 + pos
                known = memo.get(key)
                if known is not None:
                    return known

            up, down = pos - 9, pos + 9
            left, right = pos - 1, pos + 1
            v_up, v_down = vis[up], vis[down]
            v_left, v_right = vis[left], vis[right]

            # The free part of the board would be cut in two.
            if v_up and v_down and not (v_left or v_right):
                return 0
            if v_left and v_right and not (v_up or v_down):
                return 0
            if vis[pos - 8] and not v_up and not v_right and (v_down or v_left):
                return 0
            if vis[pos - 10] and not v_up and not v_left and (v_down or v_right):
                return 0
            if vis[pos + 8] and not v_down and not v_left and (v_up or v_right):
                return 0
            if vis[pos + 10] and not v_down and not v_right and (v_up or v_left):
                return 0

            vis[pos] = 1
            nmask = mask | (1 << pos)
            total = 0
            move = p[step]
            if move:
                npos = pos + move
                if not vis[npos]:
                    total = go(step + 1, npos, nmask)
            else:
                if not v_down:
                    total += go(step + 1, down, nmask)
                if not v_right:
                    total += go(step + 1, right, nmask)
                if not v_up:
                    total += go(step + 1, up, nmask)
                if not v_left:
                    total += go(step + 1, left, nmask)
            vis[pos] = 0
            if step == MEMO_STEP:
                memo[key] = total
            return total

        return go(0, 10, 0)
