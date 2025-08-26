// src/components/StudentSearch.jsx
import { useState, useEffect } from 'react';
import { Combobox } from '@headlessui/react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// De component accepteert nu 'initialStudent' en andere props
export default function StudentSearch({ onStudentSelect, schoolId, initialStudent = null, placeholder = "Zoek op naam...", compact = false }) {
  const [queryText, setQueryText] = useState('');
  const [people, setPeople] = useState([]);
  
  // De interne 'selected' state wordt nu geïnitialiseerd met de prop
  const [selected, setSelected] = useState(initialStudent);

  // Deze useEffect zorgt ervoor dat de component update als de selectie op een andere pagina verandert
  useEffect(() => {
    setSelected(initialStudent);
  }, [initialStudent]);

  useEffect(() => {
    if (queryText.length < 2 || !schoolId) {
      setPeople([]);
      return;
    }

    const fetchPeople = async () => {
      const q = query(
        collection(db, 'toegestane_gebruikers'),
        where('school_id', '==', schoolId),
        where('rol', '==', 'leerling'),
        where('naam_lowercase', '>=', queryText.toLowerCase()),
        where('naam_lowercase', '<=', queryText.toLowerCase() + '\uf8ff'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPeople(results);
    };

    const timeoutId = setTimeout(fetchPeople, 300);
    return () => clearTimeout(timeoutId);
  }, [queryText, schoolId]);

  const handleSelect = (person) => {
    setSelected(person);
    onStudentSelect(person);
  };

  return (
    <Combobox as="div" value={selected} onChange={handleSelect}>
      <div className="relative">
        <Combobox.Input
          className={compact ? "w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" : "w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-purple-500 text-sm"}
          onChange={(event) => setQueryText(event.target.value)}
          displayValue={(person) => person?.naam || ''}
          placeholder={placeholder}
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </Combobox.Button>

        {people.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {people.map((person) => (
              <Combobox.Option
                key={person.id}
                value={person}
                className={({ active }) =>
                  classNames(
                    'relative cursor-default select-none py-2 pl-3 pr-9',
                    active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                  )
                }
              >
                {({ active, selected }) => (
                  <>
                    <span className={classNames('block truncate', selected && 'font-semibold')}>{person.naam}</span>
                    {selected && (
                      <span
                        className={classNames(
                          'absolute inset-y-0 right-0 flex items-center pr-4',
                          active ? 'text-white' : 'text-indigo-600'
                        )}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
      </div>
    </Combobox>
  );
}