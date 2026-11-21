#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long minimumEuclideanDistance(vector<vector<int>>& points) {
        int n = points.size();
        long long min_d = LLONG_MAX;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                long long dx = points[i][0] - points[j][0];
                long long dy = points[i][1] - points[j][1];
                long long d = dx * dx + dy * dy;
                if (d < min_d) min_d = d;
            }
        }
        return min_d;
    }
};
