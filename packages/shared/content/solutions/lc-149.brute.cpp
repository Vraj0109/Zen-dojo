#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    int maxPoints(vector<vector<int>>& points) {
        int n = (int)points.size();
        if (n <= 2) return n;

        int max_collinear = 2;
        for (int i = 0; i < n; ++i) {
            for (int j = i + 1; j < n; ++j) {
                int count = 2;
                long long dx = points[j][0] - points[i][0];
                long long dy = points[j][1] - points[i][1];

                for (int k = 0; k < n; ++k) {
                    if (k == i || k == j) continue;
                    long long dx2 = points[k][0] - points[i][0];
                    long long dy2 = points[k][1] - points[i][1];
                    if (dy * dx2 == dx * dy2) {
                        count++;
                    }
                }
                max_collinear = max(max_collinear, count);
            }
        }
        return max_collinear;
    }
};
