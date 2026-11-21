#include <vector>

using namespace std;

class Solution {
public:
    vector<int> hotelQueries(vector<int>& rooms, vector<int>& groups) {
        vector<int> r = rooms;
        int n = r.size();
        vector<int> ans;
        ans.reserve(groups.size());
        for (int need : groups) {
            int found = 0;
            for (int i = 0; i < n; i++) {
                if (r[i] >= need) {
                    found = i + 1;
                    r[i] -= need;
                    break;
                }
            }
            ans.push_back(found);
        }
        return ans;
    }
};
