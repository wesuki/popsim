import { gen_version_text } from "/src/version";
import { MyMath, histgram, createTableHTML } from "/src/utils";

export default class App {
  constructor({ app_element }) {
    app_element.innerHTML = `
<div class="container">
  <span class="title">PopCrisis</span>
  <span class="version">${gen_version_text()}</span>
</div>
<div> 
  A population simulator. 
</div>

---

<div id="params">
</div>

---

<div id="stats">
</div>

---

<div id="controls">
  <button id="start-button">Start</button>
  <button id="reset-button">Reset</button>
</div>
`;

    const params = {
      starting_population: {
        display_name: "starting population",
        data_type: ["numeric", "int"],
        default_value: 1000
      },
      starting_age_distribution: {
        display_name: "starting age distribution",
        data_type: ["symbolic", "choice"],
        choices: {
          // A function that randomly generate an age upon calling
          default: () => {
            return Math.random() * 80;
          }
        },
        default_value: "default"
      },
      reproduction_rate_by_age: {
        display_name: "reproduction rate by age",
        data_type: ["symbolic", "choice"],
        choices: {
          // A function that maps age to the expected number of offsprings per year per sim of that age.
          // E.g. (20.3) => (0.1) means a sim of age 20.3 will in average have $0.1t$ offsprings
          // between their $[20.3-t/2 ~ 20.3+t/2]$ when $t \to 0$.
          default: (age) => {
            return age > 18 && age < 40 ? 0.05 : 0;
          }
        },
        default_value: "default"
      },
      death_rate_by_age: {
        display_name: "death rate by age",
        data_type: ["symbolic", "choice"],
        choices: {
          // A function that maps age to the expected number of offsprings per year per sim of that age.
          // E.g. (20.3) => (0.1) means a sim of age 20.3 will in average have $0.1t$ probability to die
          // between their $[20.3-t/2 ~ 20.3+t/2]$ when $t \to 0$.
          default: (age) => {
            // letting the rate of [70, 60, 50] to be roughly [2%, 1%, 0.5%],
            // inspired by the US male death rate in 2018. [source](https://www.statista.com/statistics/241572/death-rate-by-age-and-sex-in-the-us/)
            const age_justified = -3.9 + 0.07 * (age - 70); // [70, 60, 50] => [-3.9, -4.6, -5.3]
            return MyMath.sigmoid(age_justified); // [70, 60, 50] => [0.01984, 0.00995, 0.00497}
          }
        },
        default_value: "default"
      },
      simulation_granularity: {
        display_name: "simulation granularity (yr / iter)",
        data_type: ["numeric", "float"],
        default_value: 0.01
      },
      max_fps: {
        display_name: "max simulation rate (iter / s)",
        data_type: ["numeric", "float"],
        default_value: 25
      }
    };

    const stats = {
      year: {
        display_name: "year",
        data_type: ["numeric", "float"]
      },
      population: {
        display_name: "population",
        data_type: ["numeric", "int"]
      },
      age_distribution: {
        display_name: "age distribution",
        data_type: ["list", "table"]
      },
      // reproduction_rate_distribution: {
      //   display_name: "reproduction rate distribution",
      //   data_type: ["table"]
      // },
      population_growth_per_year: {
        display_name: "population growth (now compared to one year before)",
        data_type: ["numeric", "float", "percentage"]
      },
      population_growth_per_year_smoothened: {
        display_name:
          "population growth (most-recent year average compared to last year average)",
        data_type: ["numeric", "float", "percentage"]
      }
    };

    function create_stats_node(prop, definition) {
      const node = document.createElement("div");
      node.setAttribute("id", prop);
      node.appendChild(document.createTextNode(`${definition.display_name}: `));
      const value_feild = document.createElement("div");
      value_feild.setAttribute("id", "value");
      node.appendChild(value_feild);
      return node;
    }

    const stats_node = app_element.querySelector("#stats");
    for (const prop in stats) {
      const definition = stats[prop];
      stats_node.appendChild(create_stats_node(prop, definition));
    }

    function create_params_node(prop, definition) {
      const node = document.createElement("div");
      node.setAttribute("id", prop);
      node.appendChild(document.createTextNode(`${definition.display_name}: `));
      const value_feild = document.createElement("input");
      value_feild.setAttribute("id", "value");
      value_feild.value = definition.default_value;
      node.appendChild(value_feild);
      return node;
    }

    const params_node = app_element.querySelector("#params");
    for (const prop in params) {
      const definition = params[prop];
      params_node.appendChild(create_params_node(prop, definition));
    }

    this.data = {
      params,
      stats,
      sims: {}
    };

    this.app_element = app_element;
    this.nodes = {
      params: params_node,
      stats: stats_node,
      controls: app_element.querySelector("#controls")
    };

    function setup_start_button(app, button) {
      button.addEventListener("click", (event) => {
        if (button.innerText === "Start") {
          button.innerText = "Pause";
          app.is_paused = false;
        } else {
          button.innerText = "Start";
          app.is_paused = true;
        }
      });
    }
    setup_start_button(
      this,
      this.nodes.controls.querySelector("#start-button")
    );

    function setup_reset_button(app, button) {
      button.addEventListener("click", (event) => {
        app.reset();
      });
    }
    setup_reset_button(
      this,
      this.nodes.controls.querySelector("#reset-button")
    );

    this.reset();
  }

  run() {
    const app = this;
    let last_update_time;
    function main_loop(timestamp) {
      if (timestamp !== undefined) {
        if (last_update_time !== undefined) {
          const elapsed = timestamp - last_update_time;
          if (elapsed * app.data.params.max_fps.default_value >= 1000 /*ms*/) {
            const dyear = app.data.params.simulation_granularity.default_value;
            app.update(dyear);
            last_update_time = timestamp;
            app.draw();
          }
        } else {
          const dyear = app.data.params.simulation_granularity.default_value;
          app.update(dyear);
          last_update_time = timestamp;
          app.draw();
        }
      }
      requestAnimationFrame(main_loop);
    }
    this.draw();
    main_loop();
  }

  reset() {
    const { stats, params, sims } = this.data;
    sims.year = 0;
    sims.population_history = [];
    sims.ages = [];
    const age_gen =
      params.starting_age_distribution.choices[
        params.starting_age_distribution.default_value
      ];
    for (let i = 0; i < params.starting_population.default_value; i++) {
      sims.ages.push(age_gen());
    }
    this.is_paused = true;
    this.nodes.controls.querySelector("#start-button").innerText = "Start";
  }

  update(dy) {
    if (this.is_paused) return;

    const { stats, params, sims } = this.data;
    sims.year += dy;
    const death_rate_func =
      params.death_rate_by_age.choices[params.death_rate_by_age.default_value];
    const repoduction_rate_func =
      params.reproduction_rate_by_age.choices[
        params.reproduction_rate_by_age.default_value
      ];
    let updated_ages = [];
    for (const age of sims.ages) {
      if (Math.random() < dy * death_rate_func(age)) {
        // sim dies :O
        continue;
      }
      // sim survies and gains age :)
      updated_ages.push(age + dy);
      if (Math.random() < dy * repoduction_rate_func(age)) {
        // sim gives a baby XD
        updated_ages.push(0);
      }
    }
    sims.ages = updated_ages;
    sims.population_history.push(sims.ages.length);
    if (sims.population_history.length > 4 / dy) {
      sims.population_history = sims.population_history.slice(
        sims.population_history.length - Math.ceil(2 / dy)
      );
    }
  }

  draw() {
    // if (this.is_paused) return;

    const { stats, params, sims } = this.data;

    stats.year.value = sims.year;
    stats.population.value = sims.ages.length;
    stats.age_distribution.value = histgram(sims.ages, 0);
    // console.log(stats);
    const dy = params.simulation_granularity.default_value; // TODO: support variable-timestep simulation frames
    const diprev = Math.ceil(1 / dy);
    if (sims.population_history.length - diprev >= 0) {
      const pop = stats.population.value;
      const prev_pop =
        sims.population_history[sims.population_history.length - diprev];
      stats.population_growth_per_year.value =
        (pop - prev_pop) / (dy * diprev) / prev_pop;
    }
    const diprev2 = Math.ceil(2 / dy);
    if (sims.population_history.length - diprev2 >= 0) {
      const ave_pop = MyMath.mean(
        sims.population_history.slice(sims.population_history.length - diprev)
      );
      const ave_pop2 = MyMath.mean(
        sims.population_history.slice(
          sims.population_history.length - diprev2,
          sims.population_history.length - diprev2 + diprev
        )
      );
      stats.population_growth_per_year_smoothened.value =
        (ave_pop - ave_pop2) / (dy * diprev) / ave_pop2;
    }

    for (const prop in stats) {
      const { value, data_type } = stats[prop];
      let surface_value;
      if (data_type.includes("table")) {
        surface_value = createTableHTML([["Age", "Count"], ...value.entries()]);
      } else if (data_type.includes("percentage")) {
        surface_value = (value * 100).toFixed(2) + "%";
      } else if (data_type.includes("float")) {
        surface_value = value.toFixed(2);
      } else {
        surface_value = value;
      }
      const node = this.nodes.stats.querySelector(`#${prop} #value`);
      if (node) {
        node.innerHTML = surface_value;
        // console.log(prop, node, value, surface_value);
      } else {
        console.warn(
          `stats node not found for prop="${prop}" (value=${value})`
        );
      }
    }
  }
}
