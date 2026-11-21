#include <vector>
#include <map>

class Solution {
public:
    long long distinctValuesSubarrays(std::vector<int>& arr) {
        std::map<int, int> lastPos;
        long long total = 0;
        int l = 0;
        for (int r = 0; r < (int)arr.size(); r++) {
            auto it = lastPos.find(arr[r]);
            if (it != lastPos.end() && it->second >= l) {
                l = it->second + 1;
            }
            lastPos[arr[r]] = r;
            total += (r - l + 1);
        }
        return total;
    }
};
