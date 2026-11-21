#include <bits/stdc++.h>
using namespace std;

class Solution {
    struct Point {
        long long x, y;
        int id;
    };
    static long long cross(const Point& o, const Point& a, const Point& b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }
    static long long distSq(const Point& a, const Point& b) {
        long long dx = a.x - b.x;
        long long dy = a.y - b.y;
        return dx * dx + dy * dy;
    }
public:
    vector<vector<int>> convexHull(vector<vector<int>>& points) {
        int n = points.size();
        if (n <= 3) return points;

        vector<Point> pts(n);
        int start = 0;
        for (int i = 0; i < n; i++) {
            pts[i] = {points[i][0], points[i][1], i};
            if (pts[i].x < pts[start].x || (pts[i].x == pts[start].x && pts[i].y < pts[start].y)) {
                start = i;
            }
        }

        vector<int> hull_ids;
        vector<bool> in_hull(n, false);
        int cur = start;

        while (true) {
            hull_ids.push_back(cur);
            in_hull[cur] = true;
            int next_pt = (cur + 1) % n;

            for (int i = 0; i < n; i++) {
                if (i == cur) continue;
                long long c = cross(pts[cur], pts[next_pt], pts[i]);
                if (c < 0) { // i is more clockwise (further right)
                    next_pt = i;
                } else if (c == 0) { // collinear
                    // We check if i is further or closer, Jarvis march standard handles collinear points
                    if (distSq(pts[cur], pts[i]) > distSq(pts[cur], pts[next_pt])) {
                        next_pt = i;
                    }
                }
            }

            // Also include any points collinear on the segment from cur to next_pt
            for (int i = 0; i < n; i++) {
                if (i == cur || i == next_pt) continue;
                if (cross(pts[cur], pts[next_pt], pts[i]) == 0) {
                    // Check if i lies between cur and next_pt
                    if (pts[i].x >= min(pts[cur].x, pts[next_pt].x) && pts[i].x <= max(pts[cur].x, pts[next_pt].x) &&
                        pts[i].y >= min(pts[cur].y, pts[next_pt].y) && pts[i].y <= max(pts[cur].y, pts[next_pt].y)) {
                        if (!in_hull[i]) {
                            hull_ids.push_back(i);
                            in_hull[i] = true;
                        }
                    }
                }
            }

            cur = next_pt;
            if (cur == start) break;
            if (hull_ids.size() > (size_t)n * 2) break; // safeguard
        }

        vector<vector<int>> res;
        for (int id : hull_ids) {
            res.push_back({(int)pts[id].x, (int)pts[id].y});
        }
        // Deduplicate
        sort(res.begin(), res.end());
        res.erase(unique(res.begin(), res.end()), res.end());
        return res;
    }
};
