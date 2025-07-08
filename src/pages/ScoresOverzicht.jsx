import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { TrashIcon } from '@heroicons/react/24/solid';
import ConfirmModal from '../components/ConfirmModal';

export default function ScoresOverzicht() {
  const { profile } = useOutletContext();
  const [evaluaties, setEvaluaties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (!profile) return;
    fetchEvaluaties();
  }, [profile]);

  const fetchEvaluaties = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_recent_evaluations', { p_leerkracht_id: profile.id });
    if (error) {
      toast.error("Kon recente testafnames niet laden.");
    } else {
      setEvaluaties(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const { groep_id, test_id, datum } = selectedItem;

    const { error } = await supabase.rpc('delete_evaluation', {
      p_test_id: test_id,
      p_groep_id: groep_id,
      p_datum: datum,
    });

    if (error) {
      toast.error("Verwijderen mislukt.");
    } else {
      toast.success("Testafname verwijderd.");
      setEvaluaties(evaluaties.filter(ev =>
        !(ev.test_id === test_id && ev.groep_id === groep_id && ev.datum === datum)
      ));
    }

    setShowConfirm(false);
    setSelectedItem(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Recente Testafnames</h1>
        <Link to="/nieuwe-testafname" className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 px-5 rounded-lg">
          + Nieuwe Testafname
        </Link>
      </div>

      <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg">
        {loading ? (
          <p>Laden...</p>
        ) : (
          <ul className="space-y-1">
            {evaluaties.length > 0 ? evaluaties.map((item, index) => (
              <Link
  key={index}
  to={`/testafname/${item.groep_id}/${item.test_id}/${item.datum}`}
  className="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors w-full"
>
  <div className="flex flex-col">
    <p className="font-semibold text-purple-800">{item.test_naam}</p>
    <p className="text-sm text-gray-600">{item.groep_naam}</p>
  </div>
  <div className="flex items-center gap-4">
    <p className="text-sm text-gray-500 whitespace-nowrap">
      {new Date(item.datum).toLocaleDateString()}
    </p>
   <button
  onClick={(e) => {
    e.preventDefault();
    setSelectedItem(item);
    setShowConfirm(true);
  }}
  className="p-2 text-red-600 bg-transparent hover:text-red-800 focus:outline-none focus:ring-0 active:bg-transparent"
  style={{ WebkitTapHighlightColor: 'transparent' }}
  title="Verwijder testafname"
>
  <TrashIcon className="h-5 w-5" />
</button>
  </div>
</Link>
            )) : (
              <p className="text-center text-gray-500 py-8">Er zijn nog geen scores ingevoerd.</p>
            )}
          </ul>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Weet je zeker dat je deze testafname wil verwijderen?"
      >
        Deze actie kan niet ongedaan gemaakt worden.
      </ConfirmModal>
    </div>
  );
}
