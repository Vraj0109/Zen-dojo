#include <vector>
#include <set>

class Solution {
public:
    std::vector<int> trafficLights(int streetLength, std::vector<int>& positions) {
        std::set<int> lights = {0, streetLength};
        std::multiset<int> lens = {streetLength};
        std::vector<int> ans;
        ans.reserve(positions.size());
        for (int p : positions) {
            auto it = lights.upper_bound(p);
            int r = *it;
            int l = *prev(it);
            lens.erase(lens.find(r - l));
            lens.insert(p - l);
            lens.insert(r - p);
            lights.insert(p);
            ans.push_back(*lens.rbegin());
        }
        return ans;
    }
};
