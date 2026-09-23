import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',

  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const url = 'http://localhost:3000/api/v1/users/me';

  const params = {
    headers: {
      Authorization: `Bearer ${__ENV.TOKEN}`,
    },
  };

  const response = http.get(url, params);

  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}