/* global importScripts, requirejs */

const WACL_BASE = "/vendor/wacl";
let interpreter = null;
let stdout = [];
let stderr = [];

self.require = { baseUrl: WACL_BASE };
importScripts(`${WACL_BASE}/require.js`);

const EDA_PRELUDE = String.raw`
namespace eval ::eda {
    variable trace {}
    variable objects [dict create \
        cell:u_cpu [dict create TYPE cell NAME u_cpu REF_NAME cpu_top IS_SEQUENTIAL 0 LOC SLICE_X18Y42] \
        cell:u_cpu/state_reg [dict create TYPE cell NAME u_cpu/state_reg REF_NAME FDRE IS_SEQUENTIAL 1 LOC SLICE_X18Y43] \
        cell:u_cpu/data_lut [dict create TYPE cell NAME u_cpu/data_lut REF_NAME LUT6 IS_SEQUENTIAL 0 LOC SLICE_X18Y43] \
        cell:u_dma [dict create TYPE cell NAME u_dma REF_NAME dma_top IS_SEQUENTIAL 0 LOC SLICE_X28Y40] \
        cell:u_dma/count_reg [dict create TYPE cell NAME u_dma/count_reg REF_NAME FDRE IS_SEQUENTIAL 1 LOC SLICE_X28Y41] \
        cell:u_uart/rx_reg [dict create TYPE cell NAME u_uart/rx_reg REF_NAME FDCE IS_SEQUENTIAL 1 LOC SLICE_X8Y21] \
        cell:u_mem/valid_reg [dict create TYPE cell NAME u_mem/valid_reg REF_NAME FDRE IS_SEQUENTIAL 1 LOC SLICE_X35Y18] \
        port:sys_clk [dict create TYPE port NAME sys_clk DIRECTION IN HAS_INPUT_DELAY 0 HAS_OUTPUT_DELAY 0] \
        port:reset_n [dict create TYPE port NAME reset_n DIRECTION IN HAS_INPUT_DELAY 1 HAS_OUTPUT_DELAY 0] \
        port:out_data [dict create TYPE port NAME out_data DIRECTION OUT HAS_INPUT_DELAY 0 HAS_OUTPUT_DELAY 1] \
        port:out_valid [dict create TYPE port NAME out_valid DIRECTION OUT HAS_INPUT_DELAY 0 HAS_OUTPUT_DELAY 0] \
        port:irq [dict create TYPE port NAME irq DIRECTION OUT HAS_INPUT_DELAY 0 HAS_OUTPUT_DELAY 0] \
        port:debug_bus [dict create TYPE port NAME debug_bus DIRECTION OUT HAS_INPUT_DELAY 0 HAS_OUTPUT_DELAY 1] \
        pin:u_cpu/state_reg/D [dict create TYPE pin NAME u_cpu/state_reg/D DIRECTION IN CELL u_cpu/state_reg NET data_bus] \
        pin:u_cpu/state_reg/Q [dict create TYPE pin NAME u_cpu/state_reg/Q DIRECTION OUT CELL u_cpu/state_reg NET state_q] \
        pin:u_cpu/data_lut/I0 [dict create TYPE pin NAME u_cpu/data_lut/I0 DIRECTION IN CELL u_cpu/data_lut NET state_q] \
        pin:u_cpu/data_lut/O [dict create TYPE pin NAME u_cpu/data_lut/O DIRECTION OUT CELL u_cpu/data_lut NET out_data] \
        pin:u_dma/count_reg/D [dict create TYPE pin NAME u_dma/count_reg/D DIRECTION IN CELL u_dma/count_reg NET dma_next] \
        pin:u_dma/count_reg/Q [dict create TYPE pin NAME u_dma/count_reg/Q DIRECTION OUT CELL u_dma/count_reg NET data_bus] \
        net:data_bus [dict create TYPE net NAME data_bus FANOUT 34 ROUTE_STATUS ROUTED] \
        net:state_q [dict create TYPE net NAME state_q FANOUT 5 ROUTE_STATUS ROUTED] \
        net:dma_next [dict create TYPE net NAME dma_next FANOUT 1 ROUTE_STATUS ROUTED] \
        net:out_data [dict create TYPE net NAME out_data FANOUT 8 ROUTE_STATUS ROUTED] \
        clock:sys_clk [dict create TYPE clock NAME sys_clk PERIOD 10.000 FREQUENCY 100.000] \
        clock:pixel_clk [dict create TYPE clock NAME pixel_clk PERIOD 6.734 FREQUENCY 148.500] \
        path:path_0 [dict create TYPE path NAME path_0 STARTPOINT_PIN u_cpu/state_reg/Q ENDPOINT_PIN u_mem/valid_reg/D SLACK -0.230 DATAPATH_DELAY 7.91 LOGIC_LEVELS 8] \
        path:path_1 [dict create TYPE path NAME path_1 STARTPOINT_PIN u_dma/count_reg/Q ENDPOINT_PIN u_cpu/state_reg/D SLACK 0.150 DATAPATH_DELAY 6.72 LOGIC_LEVELS 5] \
        path:path_2 [dict create TYPE path NAME path_2 STARTPOINT_PIN u_uart/rx_reg/Q ENDPOINT_PIN u_cpu/state_reg/D SLACK -0.050 DATAPATH_DELAY 7.23 LOGIC_LEVELS 7] \
    ]

    variable index [dict create \
        cell {cell:u_cpu cell:u_cpu/state_reg cell:u_cpu/data_lut cell:u_dma cell:u_dma/count_reg cell:u_uart/rx_reg cell:u_mem/valid_reg} \
        port {port:sys_clk port:reset_n port:out_data port:out_valid port:irq port:debug_bus} \
        pin {pin:u_cpu/state_reg/D pin:u_cpu/state_reg/Q pin:u_cpu/data_lut/I0 pin:u_cpu/data_lut/O pin:u_dma/count_reg/D pin:u_dma/count_reg/Q} \
        net {net:data_bus net:state_q net:dma_next net:out_data} \
        clock {clock:sys_clk clock:pixel_clk} \
        path {path:path_0 path:path_1 path:path_2} \
    ]

    proc property {handle name} {
        variable objects
        if {![dict exists $objects $handle]} { return "" }
        set record [dict get $objects $handle]
        if {![dict exists $record $name]} { return "" }
        return [dict get $record $name]
    }

    proc names {handles} {
        set result {}
        foreach handle $handles { lappend result [property $handle NAME] }
        return $result
    }

    proc record {command handles} {
        variable trace
        lappend trace [list $command [llength $handles] [names $handles]]
    }

    proc truthy {value} {
        expr {$value ni {"" 0 false FALSE no NO}}
    }

    proc match_clause {handle clause} {
        set clause [string trim $clause " \t\r\n{}"]
        if {[regexp {^([A-Z_][A-Z0-9_]*)\s*(==|!=|=~|!~|<=|>=|<|>)\s*(.+)$} $clause -> key op wanted]} {
            set actual [property $handle $key]
            set wanted [string trim $wanted " \t\r\n{}\"'"]
            switch -- $op {
                "==" { return [expr {[string equal -nocase $actual $wanted]}] }
                "!=" { return [expr {![string equal -nocase $actual $wanted]}] }
                "=~" { return [string match -nocase $wanted $actual] }
                "!~" { return [expr {![string match -nocase $wanted $actual]}] }
                "<"  { return [expr {double($actual) < double($wanted)}] }
                ">"  { return [expr {double($actual) > double($wanted)}] }
                "<=" { return [expr {double($actual) <= double($wanted)}] }
                ">=" { return [expr {double($actual) >= double($wanted)}] }
            }
        }
        return [truthy [property $handle $clause]]
    }

    proc matches_filter {handle filter} {
        foreach clause [regexp -all -inline {[^&]+} $filter] {
            if {![match_clause $handle $clause]} { return 0 }
        }
        return 1
    }

    proc related {kind sources candidates} {
        set result {}
        set sourceNames [names $sources]
        foreach candidate $candidates {
            set candidateType [property $candidate TYPE]
            set candidateName [property $candidate NAME]
            foreach source $sources {
                set sourceType [property $source TYPE]
                set sourceName [property $source NAME]
                set hit 0
                if {$kind eq "pin" && $sourceType eq "cell"} {
                    set hit [expr {[property $candidate CELL] eq $sourceName}]
                } elseif {$kind eq "net" && $sourceType eq "pin"} {
                    set hit [expr {$candidateName eq [property $source NET]}]
                } elseif {$kind eq "cell" && $sourceType eq "pin"} {
                    set hit [expr {$candidateName eq [property $source CELL]}]
                } elseif {$kind eq "pin" && $sourceType eq "net"} {
                    set hit [expr {[property $candidate NET] eq $sourceName}]
                }
                if {$hit && $candidate ni $result} { lappend result $candidate }
            }
        }
        return $result
    }

    proc query {kind args} {
        variable index
        set candidates [dict get $index $kind]
        set patterns {}
        set filter ""
        set ofObjects {}
        set slackLimit ""

        for {set i 0} {$i < [llength $args]} {incr i} {
            set arg [lindex $args $i]
            switch -- $arg {
                -quiet - -hier - -hierarchical - -nocase {}
                -filter {
                    incr i
                    set filter [lindex $args $i]
                }
                -of_objects {
                    incr i
                    set ofObjects [lindex $args $i]
                }
                -slack_lesser_than {
                    incr i
                    set slackLimit [lindex $args $i]
                }
                -max_paths - -nworst {
                    incr i
                }
                default {
                    if {![string match -* $arg]} { lappend patterns $arg }
                }
            }
        }

        if {[llength $ofObjects]} {
            set candidates [related $kind $ofObjects $candidates]
        }
        if {![llength $patterns]} { set patterns {*} }

        set result {}
        foreach handle $candidates {
            set name [property $handle NAME]
            set nameHit 0
            foreach pattern $patterns {
                if {[string match -nocase $pattern $name]} {
                    set nameHit 1
                    break
                }
            }
            if {!$nameHit} continue
            if {$filter ne "" && ![matches_filter $handle $filter]} continue
            if {$slackLimit ne "" && !([property $handle SLACK] < $slackLimit)} continue
            lappend result $handle
        }
        if {$kind eq "path"} {
            set command get_timing_paths
        } else {
            set command [format "get_%ss" $kind]
        }
        record $command $result
        return $result
    }

    proc get_cells {args} { query cell {*}$args }
    proc get_ports {args} { query port {*}$args }
    proc get_pins {args} { query pin {*}$args }
    proc get_nets {args} { query net {*}$args }
    proc get_clocks {args} { query clock {*}$args }
    proc get_timing_paths {args} { query path {*}$args }

    proc get_property {name handles} {
        set result {}
        foreach handle $handles { lappend result [property $handle $name] }
        record get_property $handles
        if {[llength $result] == 1} { return [lindex $result 0] }
        return $result
    }

    proc get_object_name {handles} { names $handles }

    proc list_property {handle} {
        variable objects
        if {![dict exists $objects $handle]} { return {} }
        return [lsort [dict keys [dict get $objects $handle]]]
    }

    proc report_property {handles} {
        variable objects
        set lines {}
        foreach handle $handles {
            lappend lines "Property report: [property $handle NAME]"
            dict for {key value} [dict get $objects $handle] {
                lappend lines [format "  %-18s %s" $key $value]
            }
        }
        return [join $lines \n]
    }

    proc filter {handles expression} {
        set result {}
        foreach handle $handles {
            if {[matches_filter $handle $expression]} { lappend result $handle }
        }
        record filter $result
        return $result
    }

    proc add_flow_trace {command detail} {
        variable trace
        lappend trace [list $command 1 [list $detail]]
    }

    proc snapshot {} {
        variable trace
        set rows {}
        foreach item $trace {
            lassign $item command count handles
            lappend rows [join [list $command $count [join $handles \u001d]] \u001f]
        }
        return [join $rows \u001e]
    }
}

foreach command {
    get_cells get_ports get_pins get_nets get_clocks get_timing_paths
    get_property get_object_name list_property report_property filter
} {
    proc ::$command {args} "tailcall ::eda::$command {*}\$args"
}

namespace eval ::flow {
    variable state new
    variable project ""
    variable design ""
    variable files {}

    proc event {command detail} {
        ::eda::add_flow_trace $command $detail
        return $detail
    }

    proc create_project {args} {
        variable state
        variable project
        set state project_open
        set project [lindex $args 0]
        event create_project "project=$project"
        return $project
    }

    proc add_files {args} {
        variable files
        set newFiles [lindex $args end]
        lappend files {*}$newFiles
        event add_files [join $newFiles ,]
        return ""
    }

    proc read_verilog {args} {
        variable files
        set file [lindex $args end]
        lappend files $file
        event read_verilog $file
        return ""
    }

    proc read_xdc {args} {
        variable files
        set file [lindex $args end]
        lappend files $file
        event read_xdc $file
        return ""
    }

    proc synth_design {args} {
        variable state
        variable design
        set state synthesized
        set topIndex [lsearch $args -top]
        set design [expr {$topIndex >= 0 ? [lindex $args [expr {$topIndex + 1}]] : "top"}]
        event synth_design "top=$design"
        return "Synthesis finished: $design"
    }

    proc simple_stage {name nextState allowedStates} {
        variable state
        if {$state ni $allowedStates} {
            error "$name cannot run while design state is $state"
        }
        set state $nextState
        event $name $nextState
        return "$name complete"
    }

    proc report_timing_summary {args} {
        event report_timing_summary "WNS=-0.230 TNS=-0.510 failing=2"
        return "Timing summary\nWNS -0.230 ns\nTNS -0.510 ns\nFailing endpoints 2"
    }

    proc report_utilization {args} {
        event report_utilization "LUT=42.1% FF=31.8% BRAM=18.0%"
        return "Utilization\nLUT 42.1%\nFF 31.8%\nBRAM 18.0%"
    }
}

proc ::create_project {args} { tailcall ::flow::create_project {*}$args }
proc ::add_files {args} { tailcall ::flow::add_files {*}$args }
proc ::read_verilog {args} { tailcall ::flow::read_verilog {*}$args }
proc ::read_xdc {args} { tailcall ::flow::read_xdc {*}$args }
proc ::synth_design {args} { tailcall ::flow::synth_design {*}$args }
proc ::opt_design {args} {
    ::flow::simple_stage opt_design optimized {synthesized}
}
proc ::place_design {args} {
    ::flow::simple_stage place_design placed {synthesized optimized}
}
proc ::phys_opt_design {args} {
    ::flow::simple_stage phys_opt_design phys_optimized {placed}
}
proc ::route_design {args} {
    ::flow::simple_stage route_design routed {placed phys_optimized}
}
proc ::report_timing_summary {args} { tailcall ::flow::report_timing_summary {*}$args }
proc ::report_utilization {args} { tailcall ::flow::report_utilization {*}$args }
proc ::write_checkpoint {args} { ::flow::event write_checkpoint [lindex $args end] }
proc ::open_checkpoint {args} { ::flow::event open_checkpoint [lindex $args end] }
proc ::write_bitstream {args} { ::flow::event write_bitstream [lindex $args end] }
proc ::launch_runs {args} { ::flow::event launch_runs [join $args " "] }
proc ::wait_on_run {args} { ::flow::event wait_on_run [lindex $args end] }
proc ::open_run {args} { ::flow::event open_run [lindex $args end] }
proc ::set_property {args} { ::flow::event set_property [join $args " "] }
proc ::create_clock {args} { ::flow::event create_clock [join $args " "] }
proc ::set_input_delay {args} { ::flow::event set_input_delay [join $args " "] }
proc ::set_output_delay {args} { ::flow::event set_output_delay [join $args " "] }
proc ::current_project {} { return $::flow::project }
proc ::current_design {} { return $::flow::design }
proc ::version {args} { return "2025.1-dojo" }
`;

function encodeTcl(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function decodeTrace(raw) {
  if (!raw) return [];
  return String(raw)
    .split("\u001e")
    .filter(Boolean)
    .map((row) => {
      const [command = "", count = "0", handles = ""] = row.split("\u001f");
      return {
        command,
        count: Number(count),
        objects: handles ? handles.split("\u001d") : [],
      };
    });
}

function evalEncoded(code) {
  const encoded = encodeTcl(code);
  return interpreter.Eval(
    `interp eval dojo [encoding convertfrom utf-8 [binary decode base64 {${encoded}}]]`,
  );
}

function resetChild() {
  try {
    interpreter.Eval("if {[interp exists dojo]} {interp delete dojo}");
  } catch {
    // A failed lesson can leave a half-created interpreter; the next command
    // creates a clean one regardless.
  }
  interpreter.Eval(
    "set ::env(TCL_LIBRARY) /usr/lib/tcl8.6; set ::tcl_library /usr/lib/tcl8.6",
  );
  interpreter.Eval("interp create dojo");
  interpreter.Eval("interp hide dojo exit");
  evalEncoded(EDA_PRELUDE);
}

function runCode(code) {
  stdout = [];
  stderr = [];
  const startedAt = performance.now();
  let result = "";
  let error;
  let trace = [];

  try {
    resetChild();
    result = String(evalEncoded(code) ?? "");
  } catch (caught) {
    error = String(caught?.message ?? caught ?? "Tcl execution failed");
  }

  try {
    trace = decodeTrace(interpreter.Eval("interp eval dojo {::eda::snapshot}"));
  } catch {
    trace = [];
  }

  try {
    interpreter.Eval("interp delete dojo");
  } catch {
    // The worker itself is the final isolation boundary.
  }

  return {
    output: [...stdout, ...stderr.map((line) => `stderr: ${line}`)],
    result,
    error,
    trace,
    elapsedMs: performance.now() - startedAt,
  };
}

requirejs(["tcl/wacl"], (wacl) => {
  wacl.onReady((readyInterpreter) => {
    interpreter = readyInterpreter;
    interpreter.stdout = (line) => stdout.push(String(line));
    interpreter.stderr = (line) => stderr.push(String(line));
    const version = String(interpreter.Eval("info patchlevel"));
    self.postMessage({ type: "ready", version });
  });
}, (error) => {
  self.postMessage({
    type: "fatal",
    error: `Wacl 加载失败：${String(error?.message ?? error)}`,
  });
});

self.onmessage = (event) => {
  const message = event.data;
  if (message?.type !== "run" || !interpreter) return;
  self.postMessage({
    type: "result",
    requestId: message.requestId,
    ...runCode(String(message.code ?? "")),
  });
};
