import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, findCountry } from "@/data/geography";

/**
 * A phone number with a country dialling code the visitor can actually choose.
 *
 * ─── WHAT THIS REPLACED, AND WHY IT WAS WRONG ───────────────────────────────
 * The dial code used to be a plain <span> showing the code for whichever country
 * the buyer had selected as their business address — defaulting to +91. Three
 * things were wrong with that:
 *
 *   1. It looked hardcoded. A buyer in Dubai opening the form saw "+91" welded to
 *      the field and no way to change it, which reads as "this form is for Indian
 *      customers" on the page whose entire job is to collect export enquiries.
 *   2. It only moved on the export branch, and only after they had scrolled up and
 *      chosen a country — so most of the time it just sat there saying +91.
 *   3. A buyer's phone is not necessarily in the country their business is
 *      registered in. An Indian national running a trading company in Sharjah may
 *      well want to be called on an Indian mobile.
 *
 * So the code is now its own select over the full country list, defaulting to a
 * sensible guess and changeable at any time.
 *
 * ─── WHY THE VALUE IS AN ISO CODE, NOT THE DIAL CODE ────────────────────────
 * Dial codes are not unique: +1 is the US, Canada, Jamaica, Trinidad and more. A
 * select keyed on the dial code would collapse those into one another and React
 * would warn about duplicate keys. The ISO alpha-2 is unique; the dial code is
 * derived from it.
 */
export interface PhoneFieldProps {
  /** The national number, without the dialling code. */
  value: string;
  onChange: (value: string) => void;
  /** ISO alpha-2 of the dialling code. */
  country: string;
  onCountryChange: (iso: string) => void;
  id?: string;
  placeholder?: string;
  autoComplete?: string;
}

export function PhoneField({
  value,
  onChange,
  country,
  onCountryChange,
  id,
  placeholder = "Your number",
  autoComplete = "tel",
}: PhoneFieldProps) {
  const [search, setSearch] = useState("");

  /*
    157 countries is too many to scroll past to reach Oman. The filter matches the
    name and the dial code, so "971", "+971" and "emirates" all find the UAE.
  */
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.replace("+", "").startsWith(q)
    );
  }, [search]);

  const selected = findCountry(
    COUNTRIES.find((c) => c.code === country)?.name ?? ""
  );

  return (
    <div className="flex">
      <Select
        value={country}
        onValueChange={(iso) => {
          onCountryChange(iso);
          setSearch("");
        }}
      >
        {/*
          Fixed width, so a long country name cannot shove the number field off
          the row. The trigger shows the code only; the name is in the list.
        */}
        <SelectTrigger
          className="w-[104px] shrink-0 rounded-r-none border-r-0 font-mono"
          aria-label="Country dialling code"
        >
          <SelectValue placeholder="+91">{selected?.dial ?? "+91"}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <div className="sticky top-0 z-10 bg-popover p-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code"
              className="h-8"
              // Radix moves focus to the list on open; without this the box cannot
              // be typed into at all.
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          {shown.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No country matches &ldquo;{search}&rdquo;
            </p>
          ) : (
            shown.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="font-mono text-muted-foreground">{c.dial}</span>{" "}
                <span>{c.name}</span>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        className="rounded-l-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** The full number as it should be stored and dialled: "+971 501234567". */
export function composePhone(iso: string, national: string): string {
  const dial = COUNTRIES.find((c) => c.code === iso)?.dial ?? "+91";
  return `${dial} ${national.trim()}`.trim();
}
