#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    vector<int> movieFestivalQueries(vector<vector<int>>& movies, vector<vector<int>>& queries) {
        vector<pair<int, int>> mv;
        for (const auto& m : movies) {
            mv.push_back({m[1], m[0]}); // {end, start}
        }
        sort(mv.begin(), mv.end()); // sort by end time
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0], b = q[1];
            int count = 0, lastEnd = a;
            for (const auto& m : mv) {
                int end = m.first;
                int start = m.second;
                if (start >= lastEnd && end <= b) {
                    count++;
                    lastEnd = end;
                }
            }
            ans.push_back(count);
        }
        return ans;
    }
};
