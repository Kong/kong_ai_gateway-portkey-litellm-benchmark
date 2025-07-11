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
  "model": "wiremock",
  "messages": [
    {
      "role": "user",
      "content": __ENV.PROMPT
    }
  ]
};

    let url;
    url = `http://` + __ENV.LITELLM_LB + `:4000/chat/completions`;


    let res;
    res = http.post(url, JSON.stringify(data), { timeout: '600s' , headers: {'Content-Type': 'application/json', }});



    check(res, {
        'status was 200': (r) => r.status == 200,
        'status was 401': (r) => r.status == 401,
        'status was 403': (r) => r.status == 403,
        'status was 404': (r) => r.status == 404,
        'status was 429': (r) => r.status == 429,
        'status was 500': (r) => r.status == 500,
        'no response': (r) => !r.status,
    });
}

