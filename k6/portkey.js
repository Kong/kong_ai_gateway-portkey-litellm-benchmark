import http from 'k6/http';
import { check } from 'k6';
import encoding from 'k6/encoding';


export const options = {
  vus: __ENV.K6_VUS || 400,
  duration: __ENV.K6_DURATION || '180s',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count'],
};



export default function () {
    let data = {
  "messages": [
    {
      "role": "user",
      "content": __ENV.PROMPT
    }
  ]
};

    let url;
    url = `http://` + __ENV.PORTKEY_LB + `:8787/v1/chat`;

    let wiremock_url;
    wiremock_url = `http://` + __ENV.WIREMOCK_LB + `:9021`;

    let headers = {
       'Content-Type': 'application/json',
       'x-portkey-provider': 'openai',
       'x-portkey-custom-host': wiremock_url
    };

    let res;
    res = http.post(url, JSON.stringify(data), { timeout: '600s' , headers: headers });


    check(res, {
        'status was 200': (r) => r.status == 200,
        'status was 401': (r) => r.status == 401,
        'status was 403': (r) => r.status == 403,
        'status was 404': (r) => r.status == 404,
        'status was 429': (r) => r.status == 429,
        'status was 500': (r) => r.status == 500,
        'status was 501': (r) => r.status == 501,
        'status was 502': (r) => r.status == 502,
        'status was 503': (r) => r.status == 503,
        'status was 504': (r) => r.status == 504,
        'status was 505': (r) => r.status == 505,
        'no response': (r) => !r.status,

    });
}