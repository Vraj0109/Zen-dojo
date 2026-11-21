#include <vector>

using namespace std;

class Solution {
public:
    vector<int> listRemovals(vector<int>& arr, vector<int>& positions) {
        vector<int> a = arr;
        vector<int> ans;
        ans.reserve(positions.size());
        for (int p : positions) {
            int idx = p - 1;
            ans.push_back(a[idx]);
            a.erase(a.begin() + idx);
        }
        return ans;
    }
};
