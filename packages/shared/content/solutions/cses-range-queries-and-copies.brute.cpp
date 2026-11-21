#include <vector>

using namespace std;

class Solution {
public:
    vector<long long> rangeQueriesAndCopies(vector<int>& arr, vector<vector<int>>& queries) {
        vector<vector<long long>> arrays;
        arrays.push_back(vector<long long>(arr.begin(), arr.end()));
        vector<long long> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                int a = q[2] - 1;
                long long x = q[3];
                arrays[k][a] = x;
            } else if (q[0] == 2) {
                int k = q[1] - 1;
                int a = q[2] - 1;
                int b = q[3] - 1;
                long long sum = 0;
                for (int i = a; i <= b; i++) {
                    sum += arrays[k][i];
                }
                ans.push_back(sum);
            } else {
                int k = q[1] - 1;
                arrays.push_back(arrays[k]);
            }
        }
        return ans;
    }
};
