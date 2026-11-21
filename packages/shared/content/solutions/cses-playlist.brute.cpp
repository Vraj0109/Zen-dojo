#include <vector>
#include <map>
#include <algorithm>

class Solution {
public:
    int playlist(std::vector<int>& songs) {
        std::map<int, int> lastPos;
        int left = 0, best = 0;
        for (int right = 0; right < (int)songs.size(); right++) {
            auto it = lastPos.find(songs[right]);
            if (it != lastPos.end() && it->second >= left) {
                left = it->second + 1;
            }
            lastPos[songs[right]] = right;
            best = std::max(best, right - left + 1);
        }
        return best;
    }
};
